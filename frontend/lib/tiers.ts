import { TicketType, TicketTypeCategory } from '@/types';

/**
 * Ticket tier presentation, shared by the poster price strip, the tier picker
 * in the cart, and the order summaries. Colour is decoration — every tier is
 * also named in text, so nothing here carries meaning on its own.
 */
export const TIER_ORDER: TicketTypeCategory[] = ['EARLY_BIRD', 'REGULAR', 'STUDENT', 'VIP', 'VVIP'];

export const TIER_LABELS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'Early Bird',
  REGULAR: 'Regular',
  STUDENT: 'Student',
  VIP: 'VIP',
  VVIP: 'VVIP',
};

export const TIER_BLURBS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'Discounted release — limited quantity, first come first served.',
  REGULAR: 'Standard general admission entry.',
  STUDENT: 'Reduced price — a valid student ID may be checked at the gate.',
  VIP: 'Premium access with a better view and shorter queues.',
  VVIP: 'Top tier — the best seating and hospitality on offer.',
};

/** Solid chip colour (used on dark poster cards). */
export const TIER_CHIP_COLORS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'bg-emerald-600',
  REGULAR: 'bg-sky-500',
  STUDENT: 'bg-amber-500',
  VIP: 'bg-violet-500',
  VVIP: 'bg-brand-600',
};

/** Tinted chip colour (used on light surfaces such as the tier picker). */
export const TIER_TINT_COLORS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REGULAR: 'bg-sky-50 text-sky-700 ring-sky-200',
  STUDENT: 'bg-amber-50 text-amber-700 ring-amber-200',
  VIP: 'bg-violet-50 text-violet-700 ring-violet-200',
  VVIP: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function tierLabel(category: string): string {
  return TIER_LABELS[category as TicketTypeCategory] ?? category.replace(/_/g, ' ');
}

export type TierStatus = 'AVAILABLE' | 'SOLD_OUT' | 'CLOSED' | 'NOT_YET_ON_SALE';

/**
 * Single source of truth for whether a tier can be bought right now. The API
 * re-checks all of this at order creation, so this only decides what the UI
 * is allowed to offer.
 */
export function getTierStatus(tier: TicketType): TierStatus {
  const now = Date.now();
  const notYetOpen = Boolean(tier.salesStart && new Date(tier.salesStart).getTime() > now);
  const windowClosed = Boolean(tier.salesEnd && new Date(tier.salesEnd).getTime() < now);

  if (tier.availabilityStatus && tier.availabilityStatus !== 'AVAILABLE') return tier.availabilityStatus;
  if (windowClosed) return 'CLOSED';
  if (notYetOpen) return 'NOT_YET_ON_SALE';
  if (tier.quantity - tier.quantitySold <= 0) return 'SOLD_OUT';
  return 'AVAILABLE';
}

/**
 * Cheapest first, so a tier list always reads as a price ladder however an
 * event names or orders its tiers. Category order only breaks ties.
 */
export function sortTiers(ticketTypes: TicketType[]): TicketType[] {
  return [...ticketTypes].sort((a, b) => {
    const byPrice = Number(a.price) - Number(b.price);
    if (byPrice !== 0) return byPrice;
    const ai = TIER_ORDER.indexOf(a.category);
    const bi = TIER_ORDER.indexOf(b.category);
    return (ai === -1 ? TIER_ORDER.length : ai) - (bi === -1 ? TIER_ORDER.length : bi);
  });
}
