import { z } from 'zod';

export const EventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED']);
export type EventStatus = z.infer<typeof EventStatusSchema>;

/** Display names for ticket tiers. The backend may send other free-text names too. */
export const TICKET_TIER_NAMES = ['Student', 'Early Bird', 'Regular', 'VIP', 'VVIP'] as const;
export type TicketTierName = (typeof TICKET_TIER_NAMES)[number];

export const TicketTypeSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.number(),
  quantityAvailable: z.number(),
  quantityRemaining: z.number(),
  salesStart: z.string().optional().nullable(),
  salesEnd: z.string().optional().nullable(),
});
export type TicketType = z.infer<typeof TicketTypeSchema>;

export const EventCategorySchema = z.enum([
  'Music',
  'Theatre',
  'Festivals',
  'Conferences',
  'Sports',
  'Nightlife',
]);
export type EventCategory = z.infer<typeof EventCategorySchema>;

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  posterUrl: z.string(),
  venue: z.string(),
  city: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  organizerName: z.string(),
  category: z.string(),
  status: EventStatusSchema,
  featured: z.boolean(),
  ticketTypes: z.array(TicketTypeSchema),
});
export type EventItem = z.infer<typeof EventSchema>;

export const EventListResponseSchema = z.object({
  events: z.array(EventSchema),
  total: z.number(),
});
export type EventListResponse = z.infer<typeof EventListResponseSchema>;

export function isTierAvailable(tier: TicketType, now: Date = new Date()): boolean {
  if (tier.quantityRemaining <= 0) return false;
  if (tier.salesStart && now < new Date(tier.salesStart)) return false;
  if (tier.salesEnd && now > new Date(tier.salesEnd)) return false;
  return true;
}

export function lowestPrice(event: Pick<EventItem, 'ticketTypes'>): number | undefined {
  if (event.ticketTypes.length === 0) return undefined;
  return Math.min(...event.ticketTypes.map((t) => t.price));
}

export function isSoldOut(event: Pick<EventItem, 'ticketTypes'>): boolean {
  return event.ticketTypes.length > 0 && event.ticketTypes.every((t) => t.quantityRemaining <= 0);
}
