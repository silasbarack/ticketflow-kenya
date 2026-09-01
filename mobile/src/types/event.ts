import { z } from 'zod';

export const EventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED']);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventBookingModeSchema = z.enum(['INTERNAL', 'EXTERNAL']);
export type EventBookingMode = z.infer<typeof EventBookingModeSchema>;

export const TicketAvailabilityStatusSchema = z.enum([
  'AVAILABLE',
  'SOLD_OUT',
  'CLOSED',
  'NOT_YET_ON_SALE',
]);
export type TicketAvailabilityStatus = z.infer<typeof TicketAvailabilityStatusSchema>;

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
  availabilityStatus: TicketAvailabilityStatusSchema,
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
  bookingMode: EventBookingModeSchema,
  bookingUrl: z.string().optional().nullable(),
  verificationSource: z.string().optional().nullable(),
  verificationSourceUrl: z.string().optional().nullable(),
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
  if (tier.availabilityStatus !== 'AVAILABLE') return false;
  if (tier.salesStart && now < new Date(tier.salesStart)) return false;
  if (tier.salesEnd && now > new Date(tier.salesEnd)) return false;
  return true;
}

export function lowestPrice(event: Pick<EventItem, 'ticketTypes'>): number | undefined {
  const availablePrices = event.ticketTypes.filter((tier) => isTierAvailable(tier)).map((tier) => tier.price);
  return availablePrices.length > 0 ? Math.min(...availablePrices) : undefined;
}

export function isSoldOut(event: Pick<EventItem, 'ticketTypes'>): boolean {
  return event.ticketTypes.length > 0 && event.ticketTypes.every((tier) => !isTierAvailable(tier));
}
