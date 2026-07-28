'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Heart, MapPin } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { resolvePosterUrl } from '@/lib/posters';
import { useFavorites } from '@/hooks/useFavorites';
import Badge from '@/components/ui/Badge';
import Logo from '@/components/Logo';

const GRADIENTS = [
  'from-navy-800 to-navy-950',
  'from-brand-700 to-navy-900',
  'from-accent-700 to-navy-900',
  'from-navy-700 to-brand-900',
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash];
}

export default function EventCard({ event }: { event: EventItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const favorite = isFavorite(event.id);
  const showImage = Boolean(event.posterUrl) && !imageFailed;
  const eventUrl = `/events/${event.slug}`;

  // Cheapest first; the last (top) tier gets the highlighted chip.
  const tiers = [...event.ticketTypes].sort((a, b) => Number(a.price) - Number(b.price));
  const totalAvailable = event.ticketTypes.reduce((sum, t) => sum + Math.max(0, t.quantity - t.quantitySold), 0);
  const soldOut = event.ticketTypes.length > 0 && totalAvailable <= 0;
  const sellingFast = !soldOut && totalAvailable > 0 && totalAvailable <= 15;

  const start = new Date(event.startDateTime);
  const time = new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit' }).format(start);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(event.id);
    toast.success(favorite ? 'Removed from favourites' : 'Added to favourites', { duration: 1500 });
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-200 focus-within:-translate-y-1 focus-within:shadow-card hover:-translate-y-1 hover:shadow-card">
      {/* Brand strip — official TicketFlow Kenya logo, as used across the site */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <Logo className="h-6" wordmarkClassName="text-[13px]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Presents</span>
      </div>

      {/* Event photo */}
      <div className="relative">
        <Link href={eventUrl} tabIndex={-1} aria-hidden="true" className="block">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-100">
            {showImage ? (
              <Image
                src={resolvePosterUrl(event.posterUrl as string)}
                alt={event.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                loading="lazy"
                unoptimized
                className="object-cover transition duration-500 group-hover:scale-105"
                style={{ objectPosition: 'center 30%' }}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(event.title)} p-4`}>
                <span className="line-clamp-3 text-center text-sm font-semibold text-white/90">{event.title}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-navy-950/60 to-transparent" aria-hidden="true" />
          </div>
        </Link>

        <span className="pointer-events-none absolute left-3 top-3">
          <Badge tone="navy" className="bg-navy-900/80 backdrop-blur">
            {event.category?.name}
          </Badge>
        </span>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={favorite ? `Remove ${event.title} from favourites` : `Add ${event.title} to favourites`}
          aria-pressed={favorite}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-navy-700 shadow-soft backdrop-blur transition hover:bg-white"
        >
          <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        {(soldOut || sellingFast) && (
          <span className="pointer-events-none absolute bottom-3 left-3">
            <Badge tone={soldOut ? 'neutral' : 'accent'} className={soldOut ? 'bg-navy-900/80 text-white' : 'bg-accent-600 text-white'}>
              {soldOut ? 'Sold Out' : 'Selling Fast'}
            </Badge>
          </span>
        )}
      </div>

      {/* Event information */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <Link href={eventUrl} className="focus-visible:outline-none">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900 transition group-hover:text-brand-700">
            {event.title}
          </h3>
        </Link>

        <div className="mt-2 space-y-1.5 text-sm text-muted">
          <p className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="truncate">
              {formatDate(event.startDateTime)} &middot; {time}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </p>
        </div>

        {/* Ticket price tiers — live prices from the API, site font (Noto Sans) */}
        <div className="mt-3.5 border-t border-line pt-3">
          {tiers.length > 0 ? (
            <ul className="grid grid-cols-2 gap-1.5" aria-label="Ticket prices">
              {tiers.map((tt, i) => {
                const top = i === tiers.length - 1 && tiers.length > 1;
                return (
                  <li
                    key={tt.id}
                    className={`flex min-w-0 items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 ${
                      top ? 'bg-brand-600 text-white' : 'bg-navy-900/[0.04]'
                    }`}
                  >
                    <span className={`truncate text-[10px] font-bold uppercase tracking-wide ${top ? 'text-white/85' : 'text-muted'}`}>
                      {tt.name}
                    </span>
                    <span className={`whitespace-nowrap text-xs font-bold ${top ? 'text-white' : 'text-navy-900'}`}>
                      {formatCurrency(Number(tt.price))}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-muted">Tickets TBA</p>
          )}
        </div>

        <p className="mt-auto pt-3 text-center text-[11px] font-medium text-muted">
          Only on <span className="font-bold text-brand-700">ticketflow.co.ke</span>
        </p>
      </div>

      {/* Full-width red Book Now bar */}
      <Link
        href={eventUrl}
        aria-label={soldOut ? `View ${event.title}` : `Book tickets for ${event.title}`}
        className={`flex h-12 items-center justify-center text-sm font-bold text-white transition ${
          soldOut ? 'bg-navy-900 hover:bg-navy-800' : 'bg-brand-600 hover:bg-brand-700'
        }`}
      >
        {soldOut ? 'View Event' : 'Book Now'}
      </Link>
    </article>
  );
}
