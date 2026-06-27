import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { MpesaService } from '../mpesa/mpesa.service';
import { OrdersService } from '../orders/orders.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';

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
  ) {}

  async initiateStkPush(userId: string, dto: InitiateStkPushDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId }, include: { event: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
    if (order.status !== 'PENDING') throw new BadRequestException('This order is not awaiting payment');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MPESA',
        status: 'PENDING',
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

      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          merchantRequestId: stkResult.merchantRequestId,
          checkoutRequestId: stkResult.checkoutRequestId,
          resultDesc: stkResult.customerMessage,
        },
      });
    } catch (error: any) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', resultDesc: 'Failed to initiate STK push' },
      });
      this.logger.error('STK push initiation failed', error?.message);
      throw new BadRequestException('Could not initiate M-Pesa payment. Please try again.');
    }
  }

  /**
   * Webhook receiver for Safaricom's STK push callback. This is the ONLY
   * place that may mark a payment SUCCESS — the frontend's reported status
   * is never trusted.
   */
  async handleMpesaCallback(body: any) {
    const callback = body?.Body?.stkCallback;
    if (!callback) {
      this.logger.warn('Received malformed M-Pesa callback payload');
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    const { CheckoutRequestID, MerchantRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    const payment = await this.prisma.payment.findFirst({ where: { checkoutRequestId: CheckoutRequestID } });
    if (!payment) {
      this.logger.warn(`No payment found for CheckoutRequestID ${CheckoutRequestID}`);
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    if (payment.status !== 'PENDING') {
      // Already processed — Safaricom may retry callbacks.
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { rawCallback: body, resultCode: String(ResultCode), resultDesc: ResultDesc },
    });

    if (Number(ResultCode) === 0) {
      const receipt = this.mpesaService.extractReceiptFromCallback(CallbackMetadata);
      await this.markPaymentSuccess(payment.id, receipt);
    } else {
      await this.markPaymentFailed(payment.id);
    }

    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  private async markPaymentSuccess(paymentId: string, mpesaReceiptNumber?: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', mpesaReceiptNumber },
    });

    await this.ordersService.markPaid(payment.orderId);

    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (order) {
      await this.prisma.platformCommission.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          percentApplied: parseFloat(this.configService.get<string>('PLATFORM_COMMISSION_PERCENT') || '7'),
          amount: order.platformFee,
        },
      });
    }

    await this.ticketsService.generateForOrder(payment.orderId);

    await this.auditLogsService.log({
      action: 'PAYMENT_SUCCESS',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { orderId: payment.orderId, mpesaReceiptNumber },
    });

    return payment;
  }

  private async markPaymentFailed(paymentId: string) {
    const payment = await this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
    await this.ordersService.markFailed(payment.orderId);

    await this.auditLogsService.log({
      action: 'PAYMENT_FAILED',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { orderId: payment.orderId },
    });

    return payment;
  }

  async findById(userId: string, role: string, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (role !== 'ADMIN' && payment.order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return payment;
  }

  async findByOrder(userId: string, role: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

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
    if (payment.status !== 'PENDING') throw new BadRequestException('Payment is not pending');

    return this.markPaymentSuccess(paymentId, `MOCK${Date.now()}`);
  }
}
