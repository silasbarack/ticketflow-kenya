'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EventItem } from '@/types';
import { formatDateRange } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import { useCountdown } from '@/hooks/useCountdown';
import TicketPriceStrip from './TicketPriceStrip';

const FEATURES = [
  { icon: '\u{1F4C5}', label: 'Easy Booking' },
  { icon: '\u{1F512}', label: 'Secure Payments' },
  { icon: '\u{1F3AB}', label: 'Instant Tickets' },
];

export default function EventPosterCard({ event }: { event: EventItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const countdown = useCountdown(event.startDateTime);

  const favorite = isFavorite(event.id);
  const showImage = Boolean(event.posterUrl) && !imageFailed;
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
      className="group block overflow-hidden rounded-[18px] bg-black shadow-md ring-1 ring-black/5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {/* TicketFlow Kenya header */}
      <div className="flex items-center justify-between gap-2 bg-white px-4 py-2.5">
        <span className="relative inline-block h-9 w-9 shrink-0" style={{ aspectRatio: '1' }}>
          <Image src="/logo.png" alt="TicketFlow Kenya" fill unoptimized className="object-contain" />
        </span>
        <p className="text-right text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-700">
          Your Tickets.
          <br />
          Your Events.
          <br />
          <span className="text-brand-600">One Platform.</span>
        </p>
      </div>

      {/* Poster photo + overlaid info */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
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
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 to-black">
            <span className="px-4 text-center text-sm font-semibold text-white/90">{event.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
            ticketsAvailable ? 'bg-accent-600 text-white' : 'bg-gray-700 text-white'
          }`}
        >
          {ticketsAvailable ? 'Tickets Available' : 'Sold Out'}
        </span>

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

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-xl font-black leading-tight text-white drop-shadow-sm sm:text-2xl">
            {event.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-white/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {formatDateRange(event.startDateTime, event.endDateTime)}
            </span>
            {!countdown.isPast && (
              <span className="rounded-md bg-brand-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                {countdown.label} to go
              </span>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1 text-sm text-white/90">
            <svg className="h-3.5 w-3.5 shrink-0 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {event.venue}
          </p>
        </div>
      </div>

      {/* Ticket prices */}
      <TicketPriceStrip ticketTypes={event.ticketTypes} />

      {/* Feature row */}
      <div className="flex items-center justify-between gap-1 border-t border-white/10 bg-black px-3 py-2">
        {FEATURES.map((f) => (
          <span key={f.label} className="flex items-center gap-1 text-[9px] font-medium text-white/60">
            <span aria-hidden>{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>

      {/* Book now */}
      <div className="bg-black px-3 pb-3">
        <span className="block w-full rounded-lg bg-brand-600 py-2.5 text-center text-sm font-bold text-white transition group-hover:bg-brand-700">
          Book Now
        </span>
      </div>

      {/* Footer */}
      <div className="bg-black px-3 pb-4 text-center">
        <p className="text-[11px] text-white/50">
          Only on <span className="font-semibold text-white/80">TicketFlow Kenya</span>
        </p>
        <p className="text-[11px] text-white/40">www.ticketflow.co.ke</p>
      </div>
    </Link>
  );
}
