'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Heart, MapPin, Share2, ShieldCheck, Ticket, Zap } from 'lucide-react';
import { EventItem, TicketTypeCategory } from '@/types';
import { formatCurrency, formatDateRange } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import { useCountdown } from '@/hooks/useCountdown';
import Logo from '@/components/Logo';
import EventPoster from '@/components/EventPoster';
import { TIER_CHIP_COLORS, getTierStatus, sortTiers } from '@/lib/tiers';

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
  // Booking never leaves TicketFlow — this is the in-cart tier picker for this event.
  const bookUrl = `/cart?event=${encodeURIComponent(event.slug)}`;

  const tiers = sortTiers(event.ticketTypes);
  const anyAvailable = tiers.some((tier) => getTierStatus(tier) === 'AVAILABLE');
  const soldOut = tiers.length > 0 && tiers.every((tier) => getTierStatus(tier) === 'SOLD_OUT');
  const totalAvailable = event.ticketTypes.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.quantitySold), 0);
  const sellingFast = event.bookingMode !== 'EXTERNAL' && anyAvailable && totalAvailable > 0 && totalAvailable <= 15;

  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  // Listings TicketFlow is not authorised to sell (external sellers, unverified
  // organizers) have no Book Now — the event page carries the seller's details
  // instead. No card action ever sends the buyer to another website.
  const internalBookable = event.isBookable !== false && !externalBooking;

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
            {tiers.map((tt) => {
              const status = getTierStatus(tt);
              return (
                <li
                  key={tt.id}
                  className={`min-w-[88px] flex-1 rounded-md px-1.5 py-1.5 text-center text-white ${
                    TIER_CHIP_COLORS[tt.category as TicketTypeCategory] ?? 'bg-navy-700'
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

          {/*
            Book Now stays inside TicketFlow and opens this event's tier picker
            in the cart. Listings we cannot sell get an internal info link
            instead — no card action leaves the site.
          */}
          <Link
            href={internalBookable ? bookUrl : eventUrl}
            aria-label={
              internalBookable
                ? `Book tickets for ${event.title} — choose your tier`
                : `View event information for ${event.title}`
            }
            className={`mt-3 flex h-11 items-center justify-center rounded-full text-sm font-bold text-white transition ${
              internalBookable
                ? 'bg-gradient-to-r from-brand-500 to-brand-700 shadow-glow hover:from-brand-600 hover:to-brand-800'
                : 'bg-white/10 ring-1 ring-inset ring-white/20 hover:bg-white/15'
            }`}
          >
            {internalBookable ? 'Book Now' : externalBooking ? 'View ticket info' : 'View event info'}
          </Link>

          <p className="mt-3 text-center text-[10px] text-white/70">
            {externalBooking ? (
              'Verified event · Tickets sold by the official seller'
            ) : (
              <>
                Book and pay on <span className="font-bold text-white">TicketFlow Kenya</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-center text-[9px] text-white/45">www.ticketflow.co.ke</p>
        </div>
      </div>
    </article>
  );
}
