import { z } from 'zod';
import { EventSchema, TicketTypeSchema } from './event';

export const TicketStatusSchema = z.enum(['VALID', 'USED', 'VOID', 'REFUNDED', 'CANCELLED']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  event: EventSchema.pick({
    id: true,
    title: true,
    posterUrl: true,
    venue: true,
    city: true,
    startsAt: true,
  }),
  ticketType: TicketTypeSchema.pick({ id: true, name: true, price: true }),
  holderName: z.string(),
  holderEmail: z.email(),
  /** Server-generated, unpredictable — the QR payload. Never the holder's personal data. */
  qrToken: z.string(),
  status: TicketStatusSchema,
  issuedAt: z.string(),
  usedAt: z.string().optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const ValidateTicketRequestSchema = z.object({
  validationToken: z.string(),
  eventId: z.string(),
});
export type ValidateTicketRequest = z.infer<typeof ValidateTicketRequestSchema>;

export const ValidationResultSchema = z.enum(['VALID', 'ALREADY_USED', 'WRONG_EVENT', 'REJECTED', 'INVALID']);
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const ValidateTicketResponseSchema = z.object({
  result: ValidationResultSchema,
  message: z.string(),
  ticket: z
    .object({
      ticketNumber: z.string(),
      holderName: z.string(),
      ticketTypeName: z.string(),
      eventTitle: z.string(),
      validatedAt: z.string(),
    })
    .optional()
    .nullable(),
});
export type ValidateTicketResponse = z.infer<typeof ValidateTicketResponseSchema>;
