'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EventItem, TicketTypeCategory } from '@/types';
import { formatCurrency, formatDateRange } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import { useCountdown } from '@/hooks/useCountdown';

const TIER_ORDER: TicketTypeCategory[] = ['EARLY_BIRD', 'REGULAR', 'STUDENT', 'VIP', 'VVIP'];

const TIER_STYLES: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'bg-emerald-500 text-white',
  REGULAR: 'bg-sky-500 text-white',
  STUDENT: 'bg-amber-500 text-white',
  VIP: 'bg-violet-500 text-white',
  VVIP: 'bg-brand-600 text-white',
};

const TIER_LABELS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'Early Bird',
  REGULAR: 'Regular',
  STUDENT: 'Student',
  VIP: 'VIP',
  VVIP: 'VVIP',
};

export default function FeaturedEventCard({ event }: { event: EventItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const countdown = useCountdown(event.startDateTime);

  const favorite = isFavorite(event.id);
  const showImage = Boolean(event.posterUrl) && !imageFailed;

  const tiers = TIER_ORDER.map((category) => event.ticketTypes.find((tt) => tt.category === category)).filter(
    (tt): tt is NonNullable<typeof tt> => Boolean(tt),
  );
  const ticketsAvailable = event.ticketTypes.some((tt) => tt.quantity - tt.quantitySold > 0);
  const eventUrl = `/events/${event.slug}`;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(event.id);
    toast.success(favorite ? 'Removed from favourites' : 'Added to favourites', { duration: 1500 });
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${eventUrl}` : eventUrl;
    const shareData = { title: event.title, text: `${event.title} — ${event.venue}, ${event.city}`, url: shareUrl };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — no-op
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  return (
    <Link
      href={eventUrl}
      aria-label={`View details and tickets for ${event.title}`}
      className="group block overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {showImage ? (
          <Image
            src={event.posterUrl as string}
            alt={`${event.title} poster`}
            fill
            loading="lazy"
            unoptimized
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800">
            <span className="px-4 text-center text-sm font-semibold text-white/90">{event.title}</span>
          </div>
        )}

        {/* Tickets available badge */}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${
            ticketsAvailable ? 'bg-accent-600 text-white' : 'bg-gray-700 text-white'
          }`}
        >
          {ticketsAvailable ? 'Tickets Available' : 'Sold Out'}
        </span>

        {/* Heart + share */}
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={favorite}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.5-4.35-9.5-8.5C.5 9.2 2 5 6 5c2.2 0 3.6 1.2 6 3.5C14.4 6.2 15.8 5 18 5c4 0 5.5 4.2 3.5 7.5C18.5 16.65 12 21 12 21z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={`Share ${event.title}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.68 13.34a3 3 0 100-2.68m0 2.68a3 3 0 110-2.68m0 2.68l6.64 3.98m0-9.34a3 3 0 105.32-2.32 3 3 0 00-5.32 2.32zm0 0L8.68 10.66m6.64 6.66a3 3 0 105.32 2.32 3 3 0 00-5.32-2.32z" />
            </svg>
          </button>
        </div>

        {/* Countdown */}
        {!countdown.isPast && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {countdown.label} to go
          </span>
        )}
      </div>

      <div className="p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{event.category?.name}</span>
        <h3 className="mt-1 line-clamp-2 text-base font-bold text-gray-900">{event.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{formatDateRange(event.startDateTime, event.endDateTime)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {event.venue}
        </p>

        {tiers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Ticket prices">
            {tiers.map((tt) => (
              <span
                key={tt.id}
                className={`rounded-md px-2 py-1 text-[10px] font-bold leading-tight ${TIER_STYLES[tt.category]}`}
              >
                {TIER_LABELS[tt.category]}
                <br />
                {formatCurrency(tt.price)}
              </span>
            ))}
          </div>
        )}

        <span className="mt-4 block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition group-hover:bg-brand-700">
          Book Now
        </span>
      </div>
    </Link>
  );
}
