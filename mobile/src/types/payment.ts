import { z } from 'zod';

export const PaymentStatusSchema = z.enum(['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export interface StkPushRequest {
  orderId: string;
  phoneNumber: string;
}

export const StkPushResponseSchema = z.object({
  checkoutRequestId: z.string(),
  status: PaymentStatusSchema,
  message: z.string(),
});
export type StkPushResponse = z.infer<typeof StkPushResponseSchema>;

export const PaymentStatusResponseSchema = z.object({
  checkoutRequestId: z.string(),
  status: PaymentStatusSchema,
  orderId: z.string(),
  ticketIds: z.array(z.string()).optional(),
  failureReason: z.string().optional().nullable(),
});
export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;

/** Terminal states — once reached, polling should stop. */
export const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'];
