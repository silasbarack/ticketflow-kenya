import { Order } from '@/types/order';
import { PaymentStatus } from '@/types/payment';
import { Ticket } from '@/types/ticket';
import { User } from '@/types/auth';
import { Notification } from '@/types/notification';

/**
 * In-memory state shared by the mock service implementations, so a mock
 * order created in orders.service can be paid in payments.service and show
 * up as a ticket in tickets.service — all without a backend. Resets on
 * every app reload, which is expected for a demo data store.
 */
export const mockState: {
  currentUser: User | null;
  orders: Map<string, Order>;
  /** Buyer details captured at checkout — not part of the `Order` model itself, but needed to issue tickets. */
  orderBuyers: Map<string, { name: string; email: string }>;
  payments: Map<string, { orderId: string; status: PaymentStatus; startedAt: number }>;
  tickets: Ticket[];
  notifications: Notification[];
} = {
  currentUser: null,
  orders: new Map(),
  orderBuyers: new Map(),
  payments: new Map(),
  tickets: [],
  notifications: [
    {
      id: 'ntf-welcome',
      type: 'EVENT_REMINDER',
      title: 'Welcome to TicketFlow Kenya',
      message: 'Browse events, grab tickets, and they will show up here as you book.',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Cryptographically-unpredictable-enough demo QR token — never the holder's personal data. */
export function randomQrToken(): string {
  const bytes = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36));
  return `tfk_${bytes.join('')}`;
}
