'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Heart, MapPin, Share2, ShieldCheck, Ticket, Zap } from 'lucide-react';
import { EventItem, TicketType } from '@/types';
import { formatCurrency, formatDateRange } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import { useCountdown } from '@/hooks/useCountdown';
import Logo from '@/components/Logo';
import EventPoster from '@/components/EventPoster';

// Poster chip colours per tier, matching the official card design.
const TIER_CHIP_COLORS: Record<string, string> = {
  EARLY_BIRD: 'bg-emerald-600',
  REGULAR: 'bg-sky-500',
  STUDENT: 'bg-amber-500',
  VIP: 'bg-violet-500',
  VVIP: 'bg-brand-600',
};

const TIER_PALETTE = ['bg-emerald-600', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-brand-600'];

const TIER_ORDER = ['EARLY_BIRD', 'REGULAR', 'STUDENT', 'VIP', 'VVIP'];

/**
 * Cheapest first, so the strip reads as a price ladder however an event names
 * or orders its tiers — a KES 700 Student sits left of a KES 1,000 Early Bird.
 * Category order only breaks ties between tiers at the same price.
 */
function sortTiers(ticketTypes: TicketType[]) {
  return [...ticketTypes].sort((a, b) => {
    const byPrice = Number(a.price) - Number(b.price);
    if (byPrice !== 0) return byPrice;
    const ai = TIER_ORDER.indexOf(a.category);
    const bi = TIER_ORDER.indexOf(b.category);
    return (ai === -1 ? TIER_ORDER.length : ai) - (bi === -1 ? TIER_ORDER.length : bi);
  });
}

function getTierStatus(ticket: TicketType) {
  if (ticket.availabilityStatus === 'AVAILABLE' && ticket.salesEnd && new Date(ticket.salesEnd).getTime() < Date.now()) {
    return 'CLOSED';
  }
  if (ticket.availabilityStatus) return ticket.availabilityStatus;
  return ticket.quantity - ticket.quantitySold > 0 ? 'AVAILABLE' : 'SOLD_OUT';
}

export default function EventCard({
  event,
  /**
   * Set on the first card in a grid. Its poster is the largest contentful
   * paint, and lazy-loading it delays the LCP (Next warns about exactly this);
   * every other poster stays lazy so below-the-fold cards cost nothing.
   */
  priority = false,
}: {
  event: EventItem;
  priority?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const countdown = useCountdown(event.startDateTime, event.endDateTime);

  const favorite = isFavorite(event.id);
  const eventUrl = `/events/${event.slug}`;

  const tiers = sortTiers(event.ticketTypes);
  const anyAvailable = tiers.some((tier) => getTierStatus(tier) === 'AVAILABLE');
  const soldOut = tiers.length > 0 && tiers.every((tier) => getTierStatus(tier) === 'SOLD_OUT');
  const totalAvailable = event.ticketTypes.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.quantitySold), 0);
  const sellingFast = event.bookingMode !== 'EXTERNAL' && anyAvailable && totalAvailable > 0 && totalAvailable <= 15;

  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  // Preserve the existing TicketFlow checkout behavior for internal listings;
  // external listings bypass it and go only to their official seller.
  const internalBookable = event.isBookable !== false;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(event.id);
    toast.success(favorite ? 'Removed from favourites' : 'Added to favourites', { duration: 1500 });
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${eventUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Event link copied', { duration: 1500 });
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-navy-950 shadow-card transition-all duration-200 focus-within:-translate-y-1 focus-within:shadow-elevated hover:-translate-y-1 hover:shadow-elevated">
      {/* Brand strip — official TicketFlow Kenya logo */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2">
        <Logo variant="icon" className="h-7" />
        <p className="text-right text-[7px] font-extrabold uppercase leading-[1.5] tracking-[0.18em]">
          <span className="block text-navy-500">Your tickets.</span>
          <span className="block text-navy-500">Your events.</span>
          <span className="block text-brand-600">One platform.</span>
        </p>
      </div>

      {/* Photo with title overlay */}
      <div className="relative">
        <Link href={eventUrl} className="block focus-visible:outline-none">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-900">
            <EventPoster
              src={event.posterUrl}
              alt={event.posterAlt || `${event.title} event poster`}
              priority={priority}
              objectPosition="center 40%"
              className="transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy-950 via-navy-950/55 to-transparent" aria-hidden="true" />
            <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 px-4 pb-2.5 text-xl font-extrabold leading-snug text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              {event.title}
            </h3>
          </div>
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white ${
              !externalBooking && !internalBookable
                ? 'bg-navy-900/90'
                : soldOut
                ? 'bg-navy-900/90'
                : sellingFast
                  ? 'bg-accent-600'
                  : anyAvailable
                    ? 'bg-emerald-600'
                    : 'bg-navy-900/90'
            }`}
          >
            {!externalBooking && !internalBookable
              ? 'Not on sale here'
              : soldOut
                ? 'Sold Out'
                : sellingFast
                  ? 'Selling Fast'
                  : anyAvailable
                    ? 'Tickets Available'
                    : 'Sales Closed'}
          </span>
          {externalBooking && (
            <span className="rounded-md bg-white/90 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-navy-900">
              Official seller
            </span>
          )}
        </span>

        <div className="absolute right-3 top-3 flex gap-1.5">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={favorite ? `Remove ${event.title} from favourites` : `Add ${event.title} to favourites`}
            aria-pressed={favorite}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-soft transition hover:bg-white"
          >
            <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={`Share ${event.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-soft transition hover:bg-white"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Dark poster body */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy-900">
            {formatDateRange(event.startDateTime, event.endDateTime)}
          </span>
          <span
            className={`rounded-md px-2 py-1 text-[10px] font-extrabold text-white ${
              countdown.phase === 'ended' ? 'bg-navy-700' : countdown.phase === 'live' ? 'bg-emerald-600' : 'bg-brand-600'
            }`}
          >
            {countdown.phase === 'upcoming' ? `${countdown.label} to go` : countdown.label}
          </span>
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-white/90">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </p>

        {/* Ticket price tiers — live prices, site font (Noto Sans) */}
        {tiers.length > 0 ? (
          <ul
            className="snap-row mt-3 gap-1 pb-1"
            aria-label="Ticket prices"
          >
            {tiers.map((tt, index) => {
              const status = getTierStatus(tt);
              return (
                <li
                  key={tt.id}
                  className={`min-w-[88px] flex-1 rounded-md px-1.5 py-1.5 text-center text-white ${
                    externalBooking
                      ? TIER_PALETTE[index % TIER_PALETTE.length]
                      : TIER_CHIP_COLORS[tt.category] ?? 'bg-navy-700'
                  } ${status === 'AVAILABLE' ? '' : 'opacity-60 saturate-50'}`}
                >
                  <p className="line-clamp-2 min-h-5 text-[8px] font-extrabold uppercase leading-tight tracking-wide">{tt.name}</p>
                  <p className="mt-0.5 whitespace-nowrap text-[10px] font-extrabold leading-tight tracking-tight">
                    {formatCurrency(Number(tt.price))}
                  </p>
                  {status !== 'AVAILABLE' && (
                    <p className="mt-0.5 text-[7px] font-black uppercase leading-none">
                      {status === 'SOLD_OUT' ? 'Sold out' : status === 'CLOSED' ? 'Closed' : 'Not on sale'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-semibold text-white/70">Tickets TBA</p>
        )}

        <div className="mt-auto">
          <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-semibold text-white/70">
            <span className="flex items-center gap-1">
              <Ticket className="h-3 w-3" aria-hidden="true" /> Easy Booking
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Secure Payments
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" aria-hidden="true" /> Instant Tickets
            </span>
          </div>

          {/* Red clickable Book Now — always routed to this event's own page */}
          {externalBooking ? (
            <a
              href={event.bookingUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Book ${event.title} through the official seller (opens in a new tab)`}
              className="mt-3 flex h-11 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Book Now
            </a>
          ) : (
            <Link
              href={eventUrl}
              aria-label={internalBookable ? `Book tickets for ${event.title}` : `View event information for ${event.title}`}
              className={`mt-3 flex h-11 items-center justify-center rounded-lg text-sm font-bold text-white transition ${
                internalBookable ? 'bg-brand-600 hover:bg-brand-700' : 'bg-navy-700 hover:bg-navy-600'
              }`}
            >
              {internalBookable ? 'Book Now' : 'View event info'}
            </Link>
          )}

          <p className="mt-3 text-center text-[10px] text-white/70">
            {externalBooking ? (
              'Verified event · Tickets sold by the official seller'
            ) : (
              <>Only on <span className="font-bold text-white">TicketFlow Kenya</span></>
            )}
          </p>
          <p className="mt-0.5 text-center text-[9px] text-white/45">www.ticketflow.co.ke</p>
        </div>
      </div>
    </article>
  );
}
