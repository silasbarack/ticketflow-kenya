import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MpesaService } from '../mpesa/mpesa.service';
import { OrdersService } from '../orders/orders.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';
import { FINAL_STAGES, maskPhone, PaymentStage, PaymentStatusView } from './payment-status';
import { OperationalAlertsService } from '../automation/operational-alerts.service';
import { AutomationQueueService } from '../automation/automation-queue.service';
import { JOB_TYPES } from '../automation/job-types';
import * as crypto from 'crypto';

/** What the callback endpoint knows about where a callback came from. */
export interface CallbackContext {
  /** `?token=` from the callback URL. */
  token?: string;
  /** Client IP as Express resolved it (honours TRUST_PROXY). */
  sourceIp?: string;
}

const ACK = { ResultCode: 0, ResultDesc: 'Accepted' };

/** Buyer-facing copy per stage. Kept here so API and UI cannot drift apart. */
const STAGE_MESSAGES: Record<PaymentStage, string> = {
  INITIATED: 'Sending the M-Pesa payment request…',
  AWAITING_CUSTOMER: 'Enter your M-Pesa PIN on your phone to complete the payment.',
  VERIFYING: 'Please wait while we verify your M-Pesa transaction.',
  SUCCESS: 'Payment received.',
  CANCELLED: 'You cancelled the M-Pesa payment request.',
  FAILED: 'The M-Pesa payment could not be completed. Please try again.',
  EXPIRED: 'The M-Pesa request was not completed in time.',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private prisma: PrismaService,
    private mpesaService: MpesaService,
    private ordersService: OrdersService,
    private ticketsService: TicketsService,
    private auditLogsService: AuditLogsService,
    private configService: ConfigService,
    private alerts: OperationalAlertsService,
    private queue: AutomationQueueService,
  ) {}

  // ── Timing knobs ──────────────────────────────────────────────────────────
  // Safaricom drops an unanswered STK prompt at about 60s; the extra headroom
  // covers the callback taking a moment to come back.

  /** How long one STK prompt stays valid before we call it expired. */
  private get stkValiditySeconds(): number {
    return parseInt(this.configService.get<string>('MPESA_STK_TIMEOUT_SECONDS') || '90', 10);
  }

  /** Wait this long after initiating before bothering Daraja with a status query. */
  private get queryAfterSeconds(): number {
    return parseInt(this.configService.get<string>('MPESA_STK_QUERY_AFTER_SECONDS') || '8', 10);
  }

  /** Minimum gap between two status queries for the same payment. */
  private get queryIntervalMs(): number {
    return parseInt(this.configService.get<string>('MPESA_STK_QUERY_INTERVAL_MS') || '4000', 10);
  }

  /**
   * Absolute cut-off. Past this a payment is expired even when Daraja never
   * gave us a usable answer, so an order can never hold its stock forever. A
   * success arriving afterwards is still honoured — see markPaymentSuccess.
   */
  private get hardExpirySeconds(): number {
    return parseInt(this.configService.get<string>('MPESA_STK_HARD_EXPIRY_SECONDS') || '900', 10);
  }

  private secondsSince(date: Date): number {
    return (Date.now() - new Date(date).getTime()) / 1000;
  }

  /**
   * Serialises initiation per order inside this process. Two tabs pressing Pay
   * in the same instant would otherwise both find no pending payment, both push
   * a prompt, and the customer could be charged twice. The dedupe check below
   * only works if the checks cannot interleave.
   */
  private readonly initiationLocks = new Map<string, Promise<void>>();

  private async withOrderLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.initiationLocks.get(orderId) ?? Promise.resolve();
    // Runs whether the queued call ahead of it resolved or threw.
    const run = previous.then(fn, fn);
    const guard = run.then(
      () => undefined,
      () => undefined,
    );
    this.initiationLocks.set(orderId, guard);

    try {
      return await run;
    } finally {
      // Only the tail of the queue clears the entry, so the map cannot grow
      // without bound and a waiting caller is never orphaned.
      if (this.initiationLocks.get(orderId) === guard) this.initiationLocks.delete(orderId);
    }
  }

  // ── Initiation ────────────────────────────────────────────────────────────

  /**
   * Starts (or re-uses) an M-Pesa prompt for an order.
   *
   * Two customers of this method matter: the Pay button, and the Try Again
   * button on the payment-processing screen. Both land here, and both are safe
   * to call twice — a prompt that is still live is handed back rather than
   * pushed a second time.
   */
  async initiateStkPush(userId: string, dto: InitiateStkPushDto): Promise<PaymentStatusView> {
    return this.withOrderLock(dto.orderId, () => this.performInitiation(userId, dto));
  }

  private async performInitiation(userId: string, dto: InitiateStkPushDto): Promise<PaymentStatusView> {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId }, include: { event: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
    if (order.status === 'PAID') throw new BadRequestException('This order has already been paid for');
    if (order.status === 'CANCELLED') throw new BadRequestException('This order was cancelled');

    // Double-click / refresh guard. An in-flight prompt for this order is
    // returned as-is so one order can never ring the customer's phone twice.
    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const reconciled = await this.reconcile(existing);
      if (reconciled.status === PaymentStatus.PENDING) {
        if (!this.canSupersede(reconciled)) {
          return this.toStatusView(reconciled);
        }
        // The prompt is dead on Safaricom's side but no result ever reached us
        // — retire it so the new request starts from a clean slate.
        await this.markPaymentUnsuccessful(reconciled.id, PaymentStatus.EXPIRED, 'Superseded by a new M-Pesa request');
      }
    }

    // A previous attempt released the reservation when it failed, so take the
    // stock back before charging for it again. A no-op while the order is still
    // PENDING; throws if the tier sold out in the meantime.
    await this.ordersService.reopenForRetry(order.id);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MPESA',
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        phone: dto.phone,
      },
    });

    try {
      const stkResult = await this.mpesaService.initiateStkPush({
        phone: dto.phone,
        amount: Number(order.totalAmount),
        accountReference: order.orderNumber,
        transactionDesc: `Payment for ${order.event.title}`,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          merchantRequestId: stkResult.merchantRequestId,
          checkoutRequestId: stkResult.checkoutRequestId,
          resultDesc: stkResult.customerMessage,
          stkExpiresAt: new Date(Date.now() + this.stkValiditySeconds * 1000),
        },
      });

      await this.auditLogsService.log({
        actorId: userId,
        action: 'PAYMENT_STK_INITIATED',
        entityType: 'Payment',
        entityId: updated.id,
        metadata: { orderId: order.id, checkoutRequestId: stkResult.checkoutRequestId },
      });

      return this.toStatusView(updated);
    } catch (error: any) {
      // Nothing was charged, so the reservation stays put and the order stays
      // PENDING — the buyer can press Try Again without re-queueing for stock.
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, resultDesc: 'Could not reach M-Pesa to send the payment request' },
      });
      this.logger.error('STK push initiation failed', error?.message);
      throw new BadRequestException('Could not initiate M-Pesa payment. Please try again.');
    }
  }

  // ── Callback (the only path that may mint a SUCCESS) ──────────────────────

  /**
   * Daraja does not sign STK callbacks, so anyone who learns a
   * CheckoutRequestID can POST a convincing "ResultCode: 0". Two defences:
   *
   *  1. A shared secret in the callback URL (MPESA_CALLBACK_TOKEN, sent back as
   *     `?token=`) and an optional source-IP allowlist. A callback that fails
   *     either is ignored entirely.
   *  2. A callback that cannot prove it came from Safaricom (no token is
   *     configured) is only a *hint*: we ask Daraja's status query what really
   *     happened and act on that answer, never on the callback's claim.
   */
  private authenticateCallback(ctx: CallbackContext): { accepted: boolean; authenticated: boolean; reason?: string } {
    const allowList = (this.configService.get<string>('MPESA_CALLBACK_ALLOWED_IPS') || '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (allowList.length && (!ctx.sourceIp || !allowList.includes(ctx.sourceIp.replace(/^::ffff:/, '')))) {
      return { accepted: false, authenticated: false, reason: 'SOURCE_IP_NOT_ALLOWED' };
    }

    const expected = this.configService.get<string>('MPESA_CALLBACK_TOKEN');
    if (!expected) return { accepted: true, authenticated: false };
    const supplied = Buffer.from(ctx.token || '');
    const wanted = Buffer.from(expected);
    const ok = supplied.length === wanted.length && crypto.timingSafeEqual(supplied, wanted);
    return ok ? { accepted: true, authenticated: true } : { accepted: false, authenticated: false, reason: 'BAD_TOKEN' };
  }

  private get alwaysConfirmCallbacks(): boolean {
    return this.configService.get<string>('MPESA_CALLBACK_REQUIRE_QUERY_CONFIRMATION') === 'true';
  }

  private callbackAmount(callbackMetadata: any): number | undefined {
    const item = (callbackMetadata?.Item || []).find((i: any) => i.Name === 'Amount');
    const value = item?.Value;
    return value === undefined || value === null ? undefined : Number(value);
  }

  /**
   * Webhook receiver for Safaricom's STK push callback. This and the status
   * query in reconcile() are the ONLY places that may mark a payment SUCCESS —
   * the frontend's reported status is never trusted.
   *
   * Always acknowledges with ResultCode 0: Safaricom only needs to know we got
   * it, and an error would just make it retry the same body.
   */
  async handleMpesaCallback(body: any, ctx: CallbackContext = {}) {
    const auth = this.authenticateCallback(ctx);
    if (!auth.accepted) {
      this.logger.warn(`Rejected M-Pesa callback (${auth.reason})`);
      await this.auditLogsService.log({
        action: 'PAYMENT_CALLBACK_REJECTED',
        entityType: 'Payment',
        metadata: { reason: auth.reason, checkoutRequestId: body?.Body?.stkCallback?.CheckoutRequestID ?? null },
      });
      await this.alerts.raise({
        kind: 'PAYMENT_CALLBACK_REJECTED',
        severity: 'WARNING',
        category: 'PAYMENT',
        title: 'M-Pesa callback rejected by authenticity check',
        // One alert per hour per reason, however many forged posts arrive.
        dedupeKey: `callback-rejected:${auth.reason}:${new Date().toISOString().slice(0, 13)}`,
        details: { reason: auth.reason, note: 'Either the callback URL token is misconfigured or someone is posting forged callbacks.' },
      });
      return ACK;
    }

    const callback = body?.Body?.stkCallback;
    if (!callback) {
      this.logger.warn('Received malformed M-Pesa callback payload');
      return ACK;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    const payment = await this.prisma.payment.findFirst({ where: { checkoutRequestId: CheckoutRequestID } });
    if (!payment) {
      this.logger.warn(`No payment found for CheckoutRequestID ${CheckoutRequestID}`);
      if (auth.authenticated) {
        await this.alerts.raise({
          kind: 'PAYMENT_CALLBACK_UNMATCHED',
          severity: 'WARNING',
          category: 'PAYMENT',
          title: 'Authenticated M-Pesa callback matched no payment',
          dedupeKey: `callback-unmatched:${CheckoutRequestID}`,
          details: { checkoutRequestId: CheckoutRequestID ?? null, resultCode: ResultCode ?? null },
        });
      }
      return ACK;
    }

    await this.auditLogsService.log({
      action: 'PAYMENT_CALLBACK_RECEIVED',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { resultCode: ResultCode ?? null, authenticated: auth.authenticated, priorStatus: payment.status },
    });

    let outcome = this.mpesaService.classifyResultCode(ResultCode);
    const receipt = this.mpesaService.extractReceiptFromCallback(CallbackMetadata);

    if (outcome.outcome === 'SUCCESS') {
      // The amount is fixed by us at initiation, so a mismatch means the body
      // is not describing this payment.
      const paid = this.callbackAmount(CallbackMetadata);
      const expected = Math.ceil(Number(payment.amount));
      if (paid !== undefined && paid !== expected) {
        await this.alerts.raise({
          kind: 'PAYMENT_AMOUNT_MISMATCH',
          severity: 'CRITICAL',
          category: 'PAYMENT',
          title: 'M-Pesa callback amount does not match the payment',
          dedupeKey: `amount-mismatch:${payment.id}`,
          entityType: 'Payment',
          entityId: payment.id,
          details: { paymentId: payment.id, orderId: payment.orderId, expectedAmount: expected, callbackAmount: paid },
        });
        return ACK;
      }

      if (receipt) {
        const reused = await this.prisma.payment.findFirst({
          where: { mpesaReceiptNumber: receipt, id: { not: payment.id } },
          select: { id: true },
        });
        if (reused) {
          await this.alerts.raise({
            kind: 'PAYMENT_DUPLICATE_RECEIPT',
            severity: 'CRITICAL',
            category: 'PAYMENT',
            title: 'M-Pesa receipt number already used by another payment',
            dedupeKey: `duplicate-receipt:${payment.id}`,
            entityType: 'Payment',
            entityId: payment.id,
            details: { paymentId: payment.id, otherPaymentId: reused.id },
          });
          return ACK;
        }
      }
    }

    // Unverified callbacks (and every callback, if so configured) are settled
    // on Daraja's own answer rather than on the body's claim.
    if (!auth.authenticated || this.alwaysConfirmCallbacks) {
      const confirmation = await this.mpesaService.queryStkStatus(payment.checkoutRequestId!);
      if (confirmation.unavailable || confirmation.outcome === 'PROCESSING') {
        // Can't confirm right now. Leave it pending; the status poll and the
        // reconciliation sweep will keep asking.
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { isVerifying: payment.status === PaymentStatus.PENDING ? true : payment.isVerifying },
        });
        return ACK;
      }
      if (confirmation.outcome !== outcome.outcome) {
        await this.alerts.raise({
          kind: 'PAYMENT_CALLBACK_CONFLICT',
          severity: outcome.outcome === 'SUCCESS' ? 'CRITICAL' : 'WARNING',
          category: 'PAYMENT',
          title: 'M-Pesa callback contradicts Safaricom status query',
          dedupeKey: `callback-conflict:${payment.id}`,
          entityType: 'Payment',
          entityId: payment.id,
          details: { paymentId: payment.id, callbackOutcome: outcome.outcome, queryOutcome: confirmation.outcome, queryResultCode: confirmation.resultCode ?? null },
        });
      }
      outcome = { outcome: confirmation.outcome, message: confirmation.resultDesc || outcome.message };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      // Safaricom retries callbacks, and the reconciliation sweep may already
      // have settled this one. Two cases still deserve attention.
      if (outcome.outcome === 'SUCCESS' && payment.status !== PaymentStatus.SUCCESS) {
        // We gave up on a payment that actually went through. The money left
        // the customer's account, so honour it — late, but honour it.
        this.logger.warn(
          `Late M-Pesa success for payment ${payment.id} (was ${payment.status}) — issuing the ticket anyway`,
        );
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { rawCallback: body, resultCode: String(ResultCode), resultDesc: ResultDesc, isVerifying: false },
        });
        await this.alerts.raise({
          kind: 'PAYMENT_LATE_SUCCESS',
          severity: 'WARNING',
          category: 'PAYMENT',
          title: 'Payment succeeded after it had been written off',
          dedupeKey: `late-success:${payment.id}`,
          entityType: 'Payment',
          entityId: payment.id,
          details: { paymentId: payment.id, orderId: payment.orderId, previousStatus: payment.status },
        });
        await this.markPaymentSuccess(payment.id, receipt);
      } else if (outcome.outcome === 'SUCCESS' && !payment.mpesaReceiptNumber) {
        // Settled by status query, which does not carry a receipt number.
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { rawCallback: body, mpesaReceiptNumber: receipt },
        });
      }
      return ACK;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { rawCallback: body, resultCode: String(ResultCode), resultDesc: ResultDesc, isVerifying: false },
    });

    await this.applyOutcome(payment.id, outcome.outcome, outcome.message, CallbackMetadata);

    return ACK;
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  /**
   * Brings a pending payment up to date with Safaricom.
   *
   * The callback is the happy path, but it is delivered over the public
   * internet to a URL that may be asleep, tunnelled or simply wrong. Asking
   * Daraja directly is what makes an STK push settle correctly whether the
   * customer paid a minute ago or the instance has been idle for days.
   */
  async reconcile(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.PENDING) return payment;

    const age = this.secondsSince(payment.createdAt);

    // Initiation never got far enough to produce a CheckoutRequestID, so there
    // is nothing to query and nothing was charged.
    if (!payment.checkoutRequestId) {
      if (age > 60) {
        return this.markPaymentUnsuccessful(
          payment.id,
          PaymentStatus.FAILED,
          'The M-Pesa request was never accepted by Safaricom.',
          { releaseStock: false },
        );
      }
      return payment;
    }

    if (age < this.queryAfterSeconds) return payment;
    if (payment.lastPolledAt && Date.now() - new Date(payment.lastPolledAt).getTime() < this.queryIntervalMs) {
      return payment;
    }

    const result = await this.mpesaService.queryStkStatus(payment.checkoutRequestId);

    const polled = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        lastPolledAt: new Date(),
        // "Being processed" means the customer has answered the prompt.
        isVerifying: result.outcome === 'PROCESSING' && !result.unavailable ? true : payment.isVerifying,
        ...(result.resultCode ? { resultCode: result.resultCode } : {}),
      },
    });

    if (result.unavailable) {
      // Daraja could not be reached, so the transaction state is unknown. Only
      // the absolute cut-off may settle it — expiring a payment on the strength
      // of an outage could throw away a sale the customer actually paid for.
      if (age > this.hardExpirySeconds) {
        return this.markPaymentUnsuccessful(
          payment.id,
          PaymentStatus.EXPIRED,
          'M-Pesa did not confirm this payment in time.',
        );
      }
      return polled;
    }

    switch (result.outcome) {
      case 'SUCCESS':
        // The status query carries no receipt number; the callback backfills it
        // if it ever lands.
        return this.markPaymentSuccess(payment.id, undefined, result.resultDesc);
      case 'CANCELLED':
        return this.markPaymentUnsuccessful(
          payment.id,
          PaymentStatus.CANCELLED,
          result.resultDesc || STAGE_MESSAGES.CANCELLED,
        );
      case 'EXPIRED':
        return this.markPaymentUnsuccessful(
          payment.id,
          PaymentStatus.EXPIRED,
          result.resultDesc || STAGE_MESSAGES.EXPIRED,
        );
      case 'FAILED':
        return this.markPaymentUnsuccessful(
          payment.id,
          PaymentStatus.FAILED,
          result.resultDesc || STAGE_MESSAGES.FAILED,
        );
      default:
        // Safaricom is reachable and still has no answer. Once the prompt can no
        // longer be answered, that is a timeout.
        if (Date.now() > this.deadlineOf(polled) + 30_000) {
          return this.markPaymentUnsuccessful(payment.id, PaymentStatus.EXPIRED, STAGE_MESSAGES.EXPIRED);
        }
        return polled;
    }
  }

  /** When this prompt stops being answerable on the handset, in epoch ms. */
  private deadlineOf(payment: Payment): number {
    return payment.stkExpiresAt
      ? new Date(payment.stkExpiresAt).getTime()
      : new Date(payment.createdAt).getTime() + this.stkValiditySeconds * 1000;
  }

  /**
   * Whether a still-pending payment may be retired in favour of a fresh prompt.
   *
   * The bar is deliberately high: pushing a second prompt while the first can
   * still be paid is how a customer ends up charged twice. So we wait out the
   * full validity window, and never supersede a request Safaricom has told us
   * it is actively processing.
   */
  private canSupersede(payment: Payment): boolean {
    if (payment.isVerifying) return false;
    return this.secondsSince(payment.createdAt) > this.stkValiditySeconds;
  }

  // ── Terminal transitions ──────────────────────────────────────────────────

  private async applyOutcome(
    paymentId: string,
    outcome: 'SUCCESS' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'PROCESSING',
    message: string,
    callbackMetadata?: any,
  ): Promise<Payment> {
    switch (outcome) {
      case 'SUCCESS':
        return this.markPaymentSuccess(paymentId, this.mpesaService.extractReceiptFromCallback(callbackMetadata));
      case 'CANCELLED':
        return this.markPaymentUnsuccessful(paymentId, PaymentStatus.CANCELLED, message);
      case 'EXPIRED':
        return this.markPaymentUnsuccessful(paymentId, PaymentStatus.EXPIRED, message);
      case 'FAILED':
        return this.markPaymentUnsuccessful(paymentId, PaymentStatus.FAILED, message);
      default:
        return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    }
  }

  private async markPaymentSuccess(paymentId: string, mpesaReceiptNumber?: string, resultDesc?: string) {
    // Claim the transition so a callback and the reconciliation sweep racing on
    // the same payment cannot issue two sets of tickets.
    const claimed = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { not: PaymentStatus.SUCCESS } },
      data: {
        status: PaymentStatus.SUCCESS,
        isVerifying: false,
        ...(mpesaReceiptNumber ? { mpesaReceiptNumber } : {}),
        ...(resultDesc ? { resultDesc } : {}),
      },
    });

    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (claimed.count === 0) return payment;

    // A second successful payment for one order means the buyer was charged
    // twice (e.g. a written-off prompt succeeded after a retry was paid). The
    // order still gets exactly one set of tickets; the extra charge needs a
    // human to refund it.
    const otherSuccess = await this.prisma.payment.findFirst({
      where: { orderId: payment.orderId, status: PaymentStatus.SUCCESS, id: { not: payment.id } },
      select: { id: true },
    });
    if (otherSuccess) {
      await this.alerts.raise({
        kind: 'PAYMENT_DOUBLE_CHARGE',
        severity: 'CRITICAL',
        category: 'PAYMENT',
        title: 'Order has more than one successful payment',
        dedupeKey: `double-charge:${payment.orderId}`,
        entityType: 'Order',
        entityId: payment.orderId,
        details: { orderId: payment.orderId, paymentIds: [otherSuccess.id, payment.id], note: 'Customer likely needs a refund of one payment.' },
      });
    }

    await this.ordersService.markPaid(payment.orderId);

    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (order) {
      await this.prisma.platformCommission.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          percentApplied: parseFloat(this.configService.get<string>('PLATFORM_COMMISSION_PERCENT') || '9'),
          amount: order.platformFee,
        },
      });
    }

    await this.ticketsService.generateForOrder(payment.orderId);

    // A late success re-reserves stock even if the tier filled up meanwhile.
    const oversold = await this.prisma.$queryRaw<{ id: string; quantity: number; quantitySold: number }[]>`
      SELECT tt.id, tt.quantity, tt."quantitySold" FROM ticket_types tt
      JOIN order_items oi ON oi."ticketTypeId" = tt.id
      WHERE oi."orderId" = ${payment.orderId} AND tt."quantitySold" > tt.quantity`.catch(() => []);
    for (const tier of oversold) {
      await this.alerts.raise({
        kind: 'TICKET_TIER_OVERSOLD',
        severity: 'WARNING',
        category: 'PAYMENT',
        title: 'Ticket tier is oversold after a late payment',
        dedupeKey: `oversold:${tier.id}`,
        entityType: 'TicketType',
        entityId: tier.id,
        details: { ticketTypeId: tier.id, quantity: tier.quantity, quantitySold: tier.quantitySold },
      });
    }

    await this.auditLogsService.log({
      action: 'PAYMENT_SUCCESS',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { orderId: payment.orderId, mpesaReceiptNumber },
    });

    return payment;
  }

  /**
   * Settles a payment that will never produce a ticket. `releaseStock` is only
   * false when nothing was ever pushed to the customer, in which case the order
   * stays PENDING and keeps its reservation for an immediate retry.
   */
  private async markPaymentUnsuccessful(
    paymentId: string,
    status: Extract<PaymentStatus, 'CANCELLED' | 'EXPIRED' | 'FAILED'>,
    resultDesc?: string,
    { releaseStock = true }: { releaseStock?: boolean } = {},
  ): Promise<Payment> {
    const claimed = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status, isVerifying: false, ...(resultDesc ? { resultDesc } : {}) },
    });

    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (claimed.count === 0) return payment;

    if (releaseStock) {
      // Hands the tickets back to the tier. Idempotent inside OrdersService.
      await this.ordersService.markFailed(payment.orderId);
    }

    // Only a genuine failure (wrong PIN, no balance…) is worth an email. A
    // cancellation was the buyer's own choice and an expiry is shown on screen.
    // Sent after a short delay and skipped if the buyer has paid since.
    if (status === PaymentStatus.FAILED && releaseStock) {
      await this.queue.enqueueSafely(
        JOB_TYPES.PAYMENT_FAILED_NOTICE,
        `payment-failed:${payment.id}`,
        { paymentId: payment.id },
        { runAt: new Date(Date.now() + 5 * 60_000), maxAttempts: 4 },
      );
    }

    await this.auditLogsService.log({
      action: `PAYMENT_${status}`,
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { orderId: payment.orderId, resultCode: payment.resultCode, resultDesc },
    });

    return payment;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(userId: string, role: string, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (role !== 'ADMIN' && payment.order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return role === 'ADMIN' ? payment : this.toCustomerPayment(payment);
  }

  /**
   * What a buyer may see of their own payment row. The Daraja request ids and
   * the raw callback stay server-side: the CheckoutRequestID is exactly what a
   * forged callback would need.
   */
  private toCustomerPayment<T extends Payment>(payment: T) {
    const { checkoutRequestId, merchantRequestId, rawCallback, ...rest } = payment;
    return { ...rest, stkSent: Boolean(checkoutRequestId) };
  }

  async findByOrder(userId: string, role: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    const payments = await this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    return role === 'ADMIN' ? payments : payments.map((p) => this.toCustomerPayment(p));
  }

  /**
   * The endpoint the payment-processing screen polls. Reconciling here means an
   * open checkout tab settles the payment itself, without waiting on the sweep,
   * even when the callback never arrives.
   */
  async getStatus(userId: string, role: string, paymentId: string): Promise<PaymentStatusView> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (role !== 'ADMIN' && payment.order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    const settled = await this.reconcile(payment);
    return this.toStatusView(settled);
  }

  // ── Presentation ──────────────────────────────────────────────────────────

  private deriveStage(payment: Payment): PaymentStage {
    switch (payment.status) {
      case PaymentStatus.SUCCESS:
        return 'SUCCESS';
      case PaymentStatus.CANCELLED:
        return 'CANCELLED';
      case PaymentStatus.EXPIRED:
        return 'EXPIRED';
      case PaymentStatus.FAILED:
        return 'FAILED';
      default:
        if (!payment.checkoutRequestId) return 'INITIATED';
        // A result code on a still-PENDING payment means the callback has
        // landed and settlement is a moment away.
        if (payment.isVerifying || payment.resultCode) return 'VERIFYING';
        return 'AWAITING_CUSTOMER';
    }
  }

  private async toStatusView(payment: Payment): Promise<PaymentStatusView> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: payment.orderId },
      include: { _count: { select: { tickets: true } } },
    });

    const stage = this.deriveStage(payment);

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      status: payment.status,
      stage,
      isFinal: FINAL_STAGES.includes(stage),
      amount: Number(payment.amount),
      phoneMasked: maskPhone(payment.phone),
      stkSent: Boolean(payment.checkoutRequestId),
      mpesaReceiptNumber: payment.mpesaReceiptNumber,
      resultCode: payment.resultCode,
      resultDesc: payment.resultDesc,
      message: STAGE_MESSAGES[stage],
      expiresAt: payment.stkExpiresAt ? payment.stkExpiresAt.toISOString() : null,
      ticketsIssued: order._count.tickets,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  // ── Development helper ────────────────────────────────────────────────────

  /**
   * DEVELOPMENT ONLY. Simulates a successful M-Pesa callback so the full
   * purchase -> ticket -> check-in flow can be tested locally without a
   * public callback URL or real Daraja sandbox credentials.
   */
  async mockMarkSuccess(paymentId: string) {
    if (this.configService.get<string>('ENABLE_MOCK_PAYMENTS') !== 'true') {
      throw new ForbiddenException('Mock payments are disabled');
    }
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Payment is not pending');

    return this.markPaymentSuccess(paymentId, `MOCK${Date.now()}`);
  }
}
