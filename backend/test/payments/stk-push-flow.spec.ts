import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service';
import { MpesaService, StkQueryResult } from '../../src/mpesa/mpesa.service';

/**
 * Drives the real PaymentsService state machine through every outcome the
 * checkout screen has to render. Daraja's two network calls are stubbed — the
 * result-code classification, the stock transitions and the settlement rules
 * under test are all the production code.
 */

type PaymentRow = Record<string, any>;

const ORDER_ID = 'order-1';
const NOW = () => new Date();

function makeFakes() {
  const state = {
    order: {
      id: ORDER_ID,
      orderNumber: 'TFK-TEST-0001',
      userId: 'user-1',
      status: 'PENDING' as string,
      totalAmount: 3500,
      platformFee: 289,
      event: { id: 'event-1', title: 'Test Event', startDateTime: new Date(Date.now() + 86_400_000) },
    },
    payments: [] as PaymentRow[],
    /** Tickets held against the tier. Mirrors TicketType.quantitySold. */
    reserved: 2,
    ticketsIssued: 0,
    audit: [] as string[],
    seq: 0,
  };

  const find = (id: string) => state.payments.find((p) => p.id === id);

  const prisma: any = {
    order: {
      findUnique: async () => ({ ...state.order }),
      findUniqueOrThrow: async () => ({ ...state.order, _count: { tickets: state.ticketsIssued } }),
    },
    payment: {
      findFirst: async ({ where }: any) => {
        const matches = state.payments.filter(
          (p) =>
            (where.orderId ? p.orderId === where.orderId : true) &&
            (where.status ? p.status === where.status : true) &&
            (where.checkoutRequestId ? p.checkoutRequestId === where.checkoutRequestId : true),
        );
        return matches.length ? { ...matches[matches.length - 1] } : null;
      },
      findMany: async ({ where }: any) => state.payments.filter((p) => p.orderId === where.orderId).map((p) => ({ ...p })),
      findUnique: async ({ where, include }: any) => {
        const row = find(where.id);
        if (!row) return null;
        return include?.order ? { ...row, order: { ...state.order } } : { ...row };
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const row = find(where.id);
        if (!row) throw new Error(`payment ${where.id} not found`);
        return { ...row };
      },
      create: async ({ data }: any) => {
        const row: PaymentRow = {
          id: `pay-${++state.seq}`,
          checkoutRequestId: null,
          merchantRequestId: null,
          mpesaReceiptNumber: null,
          resultCode: null,
          resultDesc: null,
          stkExpiresAt: null,
          lastPolledAt: null,
          isVerifying: false,
          createdAt: NOW(),
          ...data,
        };
        state.payments.push(row);
        return { ...row };
      },
      update: async ({ where, data }: any) => {
        const row = find(where.id);
        if (!row) throw new Error(`payment ${where.id} not found`);
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        const rows = state.payments.filter((p) => {
          if (p.id !== where.id) return false;
          if (where.status?.not) return p.status !== where.status.not;
          if (where.status) return p.status === where.status;
          return true;
        });
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    platformCommission: { upsert: async () => ({}) },
  };

  const orders: any = {
    markPaid: async () => {
      if (state.order.status !== 'PENDING') state.reserved += 2; // late success re-reserves
      state.order.status = 'PAID';
    },
    markFailed: async () => {
      if (state.order.status !== 'PENDING') return; // idempotent
      state.order.status = 'FAILED';
      state.reserved -= 2;
    },
    reopenForRetry: async () => {
      if (state.order.status === 'PENDING') return state.order;
      if (state.order.status === 'PAID') throw new BadRequestException('This order has already been paid for');
      state.order.status = 'PENDING';
      state.reserved += 2;
      return state.order;
    },
  };

  const tickets: any = { generateForOrder: async () => { state.ticketsIssued += 2; } };
  const audit: any = { log: async ({ action }: any) => { state.audit.push(action); } };

  const config = new ConfigService({
    MPESA_CONSUMER_KEY: 'k',
    MPESA_CONSUMER_SECRET: 's',
    MPESA_SHORTCODE: '174379',
    MPESA_PASSKEY: 'p',
    MPESA_CALLBACK_URL: 'https://example.test/api/payments/mpesa/callback',
    MPESA_STK_TIMEOUT_SECONDS: '90',
    MPESA_STK_QUERY_AFTER_SECONDS: '8',
    MPESA_STK_QUERY_INTERVAL_MS: '4000',
    PLATFORM_COMMISSION_PERCENT: '9',
  });

  const mpesa = new MpesaService(config);
  const service = new PaymentsService(prisma, mpesa, orders, tickets, audit, config);

  return { state, prisma, mpesa, service };
}

/** Backdates a payment so age-gated logic (query grace, expiry) can be reached. */
function ageBy(payment: PaymentRow, seconds: number) {
  payment.createdAt = new Date(payment.createdAt.getTime() - seconds * 1000);
  if (payment.stkExpiresAt) payment.stkExpiresAt = new Date(payment.stkExpiresAt.getTime() - seconds * 1000);
}

function callbackBody(checkoutRequestId: string, resultCode: number, receipt?: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'merchant-1',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: `Result ${resultCode}`,
        ...(receipt
          ? { CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: receipt }] } }
          : {}),
      },
    },
  };
}

describe('M-Pesa STK push flow', () => {
  let ctx: ReturnType<typeof makeFakes>;

  beforeEach(() => {
    ctx = makeFakes();
    jest.spyOn(ctx.mpesa, 'initiateStkPush').mockImplementation(async () => ({
      merchantRequestId: 'merchant-1',
      checkoutRequestId: `checkout-${Date.now()}-${Math.random()}`,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: 'Success. Request accepted for processing',
    }));
  });

  afterEach(() => jest.restoreAllMocks());

  const initiate = () => ctx.service.initiateStkPush('user-1', { orderId: ORDER_ID, phone: '0712345678' });
  const stubQuery = (result: Partial<StkQueryResult>) =>
    jest
      .spyOn(ctx.mpesa, 'queryStkStatus')
      .mockResolvedValue({ outcome: 'PROCESSING', unavailable: false, ...result } as StkQueryResult);

  it('reports the STK request as sent, with the phone masked', async () => {
    const view = await initiate();

    expect(view.stage).toBe('AWAITING_CUSTOMER');
    expect(view.isFinal).toBe(false);
    expect(view.checkoutRequestId).toBeTruthy();
    expect(view.phoneMasked).toBe('0712 *** 678');
    expect(view.amount).toBe(3500);
    // The full number never leaves the backend on this endpoint.
    expect(JSON.stringify(view)).not.toContain('0712345678');
  });

  it('issues tickets only once the callback confirms the payment', async () => {
    const view = await initiate();
    expect(ctx.state.ticketsIssued).toBe(0);

    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 0, 'QK12345678'));

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);
    expect(settled.stage).toBe('SUCCESS');
    expect(settled.isFinal).toBe(true);
    expect(settled.mpesaReceiptNumber).toBe('QK12345678');
    expect(ctx.state.order.status).toBe('PAID');
    expect(ctx.state.ticketsIssued).toBe(2);
  });

  it('reports a customer cancellation and releases the reservation', async () => {
    const view = await initiate();

    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 1032));

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);
    expect(settled.stage).toBe('CANCELLED');
    expect(settled.isFinal).toBe(true);
    expect(ctx.state.ticketsIssued).toBe(0);
    expect(ctx.state.reserved).toBe(0);
    expect(ctx.state.order.status).toBe('FAILED');
  });

  it('reports a wrong PIN as a failure, not a cancellation', async () => {
    const view = await initiate();

    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 2001));

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);
    expect(settled.stage).toBe('FAILED');
    expect(ctx.state.ticketsIssued).toBe(0);
  });

  it('reports an unanswered prompt as expired', async () => {
    const view = await initiate();

    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 1037));

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);
    expect(settled.stage).toBe('EXPIRED');
    expect(ctx.state.ticketsIssued).toBe(0);
  });

  it('settles from the status query when the callback never arrives', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 30);
    stubQuery({ outcome: 'SUCCESS', resultCode: '0', resultDesc: 'The service request is processed successfully.' });

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);

    expect(settled.stage).toBe('SUCCESS');
    expect(ctx.state.order.status).toBe('PAID');
    expect(ctx.state.ticketsIssued).toBe(2);
  });

  it('shows VERIFYING while Safaricom is still processing the result', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 30);
    stubQuery({ outcome: 'PROCESSING', resultDesc: 'The transaction is being processed' });

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);

    expect(settled.stage).toBe('VERIFYING');
    expect(settled.isFinal).toBe(false);
  });

  it('never expires a payment while Daraja is unreachable', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 300); // well past the 90s prompt window
    stubQuery({ outcome: 'PROCESSING', unavailable: true });

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);

    // Status unknown — settling here could throw away a sale that succeeded.
    expect(settled.stage).toBe('AWAITING_CUSTOMER');
    expect(ctx.state.order.status).toBe('PENDING');
  });

  it('expires a payment Safaricom can be reached about but never resolves', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 300);
    stubQuery({ outcome: 'PROCESSING', unavailable: false });

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);

    expect(settled.stage).toBe('EXPIRED');
    expect(ctx.state.reserved).toBe(0);
  });

  it('does not push a second prompt when Pay is pressed twice', async () => {
    const first = await initiate();
    const second = await initiate();

    expect(second.paymentId).toBe(first.paymentId);
    expect(ctx.state.payments).toHaveLength(1);
    expect(ctx.mpesa.initiateStkPush).toHaveBeenCalledTimes(1);
  });

  it('does not push a second prompt for two simultaneous Pay presses', async () => {
    const [a, b] = await Promise.all([initiate(), initiate()]);

    expect(a.paymentId).toBe(b.paymentId);
    expect(ctx.mpesa.initiateStkPush).toHaveBeenCalledTimes(1);
  });

  it('never supersedes a prompt Safaricom says it is processing', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 300);
    stubQuery({ outcome: 'PROCESSING', unavailable: true });
    ctx.state.payments[0].isVerifying = true;

    const retried = await ctx.service.initiateStkPush('user-1', { orderId: ORDER_ID, phone: '0712345678' });

    expect(retried.paymentId).toBe(view.paymentId);
    expect(ctx.mpesa.initiateStkPush).toHaveBeenCalledTimes(1);
  });

  it('sends a fresh prompt when Try Again follows a cancelled payment', async () => {
    const first = await initiate();
    await ctx.service.handleMpesaCallback(callbackBody(first.checkoutRequestId!, 1032));
    expect(ctx.state.reserved).toBe(0);

    const retry = await ctx.service.initiateStkPush('user-1', { orderId: ORDER_ID, phone: '0712345678' });

    expect(retry.paymentId).not.toBe(first.paymentId);
    expect(retry.stage).toBe('AWAITING_CUSTOMER');
    expect(ctx.mpesa.initiateStkPush).toHaveBeenCalledTimes(2);
    // The retry took the reservation back.
    expect(ctx.state.reserved).toBe(2);
    expect(ctx.state.order.status).toBe('PENDING');
  });

  it('keeps the order payable when the STK request itself fails to send', async () => {
    jest.spyOn(ctx.mpesa, 'initiateStkPush').mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(initiate()).rejects.toBeInstanceOf(BadRequestException);

    // Nothing was charged, so the reservation is untouched and Try Again works.
    expect(ctx.state.order.status).toBe('PENDING');
    expect(ctx.state.reserved).toBe(2);
    expect(ctx.state.payments[0].status).toBe('FAILED');
  });

  it('honours a success callback that lands after the payment was written off', async () => {
    const view = await initiate();
    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 1037));
    expect(ctx.state.order.status).toBe('FAILED');
    expect(ctx.state.reserved).toBe(0);

    // Safaricom retries with the real outcome — the money did leave the account.
    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 0, 'QK99999999'));

    const settled = await ctx.service.getStatus('user-1', 'CUSTOMER', view.paymentId);
    expect(settled.stage).toBe('SUCCESS');
    expect(settled.mpesaReceiptNumber).toBe('QK99999999');
    expect(ctx.state.order.status).toBe('PAID');
    expect(ctx.state.ticketsIssued).toBe(2);
    expect(ctx.state.reserved).toBe(2);
  });

  it('issues one set of tickets when the callback and the sweep race', async () => {
    const view = await initiate();
    ageBy(ctx.state.payments[0], 30);
    stubQuery({ outcome: 'SUCCESS', resultCode: '0' });

    await Promise.all([
      ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 0, 'QK55555555')),
      ctx.service.reconcile(ctx.state.payments[0] as any),
    ]);

    expect(ctx.state.ticketsIssued).toBe(2);
    expect(ctx.state.audit.filter((a) => a === 'PAYMENT_SUCCESS')).toHaveLength(1);
  });

  it('refuses to start a payment for someone else', async () => {
    await expect(
      ctx.service.initiateStkPush('someone-else', { orderId: ORDER_ID, phone: '0712345678' }),
    ).rejects.toThrow('You do not own this order');
  });

  it('refuses to pay an order twice', async () => {
    const view = await initiate();
    await ctx.service.handleMpesaCallback(callbackBody(view.checkoutRequestId!, 0, 'QK11111111'));

    await expect(initiate()).rejects.toThrow('already been paid for');
  });
});
