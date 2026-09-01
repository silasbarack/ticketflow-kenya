import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSchema = z.object({
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  items: z.array(OrderItemSchema),
  grossAmount: z.number(),
  platformFee: z.number(),
  organizerNet: z.number(),
  /**
   * The authoritative amount the customer is charged, as returned by the
   * backend — this is what gets sent to M-Pesa. Kept separate from
   * `grossAmount` because the two commission models differ: mock mode deducts
   * the 9% from the organizer's share (payable == gross), while the live
   * backend adds it on top (payable == gross + fee). Always display and charge
   * this value; never re-derive it on the device.
   */
  totalPayable: z.number(),
  currency: z.string(),
  status: OrderStatusSchema,
  createdAt: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;

/**
 * Details of the person a ticket is issued to. Collected per ticket when an
 * order covers more than one, matching the web checkout — the name is printed
 * on the ticket and the national ID is checked at the gate.
 */
export interface AttendeeInput {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  phone: string;
}

/** Orders of this size or larger must name each attendee individually. */
export const ATTENDEE_DETAILS_THRESHOLD = 2;

export interface CreateOrderItemInput {
  ticketTypeId: string;
  quantity: number;
  attendees?: AttendeeInput[];
}

export interface CreateOrderInput {
  eventId: string;
  items: CreateOrderItemInput[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}
