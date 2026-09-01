import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'PAYMENT_SUCCESSFUL',
  'PAYMENT_FAILED',
  'TICKET_ISSUED',
  'EVENT_REMINDER',
  'EVENT_CHANGED',
  'EVENT_CANCELLED',
  'REFUND_PROCESSED',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
  relatedEventId: z.string().optional().nullable(),
  relatedTicketId: z.string().optional().nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;
