import { USE_MOCK_DATA } from '@/constants/config';
import { PaymentStatusResponse, StkPushRequest, StkPushResponse } from '@/types/payment';
import { api } from './api';
import { mapPaymentStatus } from './backend-mappers';
import { delay, mockState, randomId } from './mock-state';
import { generateMockTicketsForOrder } from './tickets.service';

interface PaymentsService {
  stkPush(input: StkPushRequest): Promise<StkPushResponse>;
  getStatus(paymentId: string): Promise<PaymentStatusResponse>;
  /** Dev-only: simulates the Safaricom callback. Rejects unless the backend allows it. */
  simulateSuccess(paymentId: string): Promise<void>;
}

const realPaymentsService: PaymentsService = {
  async stkPush(input) {
    // Triggers the real Lipa na M-Pesa Online prompt via the backend's Daraja
    // integration. We poll by the backend's own payment id — Safaricom's
    // CheckoutRequestID is stored on that record but isn't a lookup key.
    const { data } = await api.post<Record<string, any>>('/payments/mpesa/stk-push', {
      orderId: input.orderId,
      phone: input.phoneNumber,
    });
    return {
      checkoutRequestId: String(data.id),
      status: mapPaymentStatus(data.status),
      message:
        typeof data.resultDesc === 'string' && data.resultDesc
          ? data.resultDesc
          : 'Enter your M-Pesa PIN on your phone to complete payment.',
    };
  },

  async getStatus(paymentId) {
    const { data } = await api.get<Record<string, any>>(`/payments/${paymentId}`);
    const status = mapPaymentStatus(data.status);
    const orderId = String(data.orderId ?? '');

    // Tickets only exist once the backend has confirmed the payment itself.
    let ticketIds: string[] | undefined;
    if (status === 'PAID' && orderId) {
      try {
        const { data: tickets } = await api.get<Record<string, any>[]>('/tickets/my');
        ticketIds = (tickets ?? []).filter((t) => t.orderId === orderId).map((t) => String(t.id));
      } catch {
        // Non-fatal: the payment still succeeded, so fall through to the
        // tickets list rather than failing the whole flow.
      }
    }

    return {
      checkoutRequestId: paymentId,
      status,
      orderId,
      ticketIds,
      failureReason: typeof data.resultDesc === 'string' ? data.resultDesc : undefined,
    };
  },

  async simulateSuccess(paymentId) {
    await api.post(`/payments/mock/${paymentId}/success`);
  },
};

/** Simulated time-to-confirmation for the mock STK push, so the pending screen has something to show. */
const MOCK_CONFIRM_AFTER_MS = 6_000;

const mockPaymentsService: PaymentsService = {
  async stkPush(input) {
    await delay(600);
    const order = mockState.orders.get(input.orderId);
    if (!order) {
      const error = new Error('Order not found') as Error & { code: string };
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }
    const checkoutRequestId = randomId('ws_CO');
    mockState.payments.set(checkoutRequestId, { orderId: input.orderId, status: 'PENDING', startedAt: Date.now() });
    return {
      checkoutRequestId,
      status: 'PENDING',
      message: 'Enter your M-Pesa PIN on your phone to complete payment.',
    };
  },
  async getStatus(checkoutRequestId) {
    await delay(400);
    const record = mockState.payments.get(checkoutRequestId);
    if (!record) {
      const error = new Error('Payment not found') as Error & { code: string };
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }

    if (record.status === 'PENDING' && Date.now() - record.startedAt >= MOCK_CONFIRM_AFTER_MS) {
      record.status = 'PAID';
      const order = mockState.orders.get(record.orderId);
      if (order) {
        order.status = 'PAID';
        const tickets = generateMockTicketsForOrder(order);
        mockState.notifications.unshift({
          id: randomId('ntf'),
          type: 'PAYMENT_SUCCESSFUL',
          title: 'Payment successful',
          message: `Your payment for order ${order.id} was confirmed. Your tickets are ready.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        return {
          checkoutRequestId,
          status: 'PAID',
          orderId: record.orderId,
          ticketIds: tickets.map((t) => t.id),
        };
      }
    }

    return { checkoutRequestId, status: record.status, orderId: record.orderId };
  },
  async simulateSuccess(checkoutRequestId) {
    // Mock mode already auto-confirms on a timer; this just brings it forward.
    const record = mockState.payments.get(checkoutRequestId);
    if (record) record.startedAt = 0;
  },
};

export const paymentsService: PaymentsService = USE_MOCK_DATA ? mockPaymentsService : realPaymentsService;
