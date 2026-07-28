'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Heart, MapPin } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import Badge from '@/components/ui/Badge';

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

  const lowestPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : undefined;
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
    <Link
      href={eventUrl}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-card focus-visible:-translate-y-1 focus-visible:shadow-card"
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-navy-100">
        {showImage ? (
          <Image
            src={event.posterUrl as string}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            loading="lazy"
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(event.title)} p-4`}>
            <span className="line-clamp-3 text-center text-sm font-semibold text-white/90">{event.title}</span>
          </div>
        )}

        <span className="absolute left-3 top-3">
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
          <span className="absolute bottom-3 left-3">
            <Badge tone={soldOut ? 'neutral' : 'accent'} className={soldOut ? 'bg-navy-900/80 text-white' : 'bg-accent-600 text-white'}>
              {soldOut ? 'Sold Out' : 'Selling Fast'}
            </Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900">{event.title}</h3>

        <div className="mt-2.5 space-y-1.5 text-sm text-muted">
          <p className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {formatDate(event.startDateTime)} &middot; {time}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3.5">
          <p className="text-[15px] font-bold text-navy-900">
            {lowestPrice !== undefined ? (
              <>
                From <span>{formatCurrency(lowestPrice)}</span>
              </>
            ) : (
              'Tickets TBA'
            )}
          </p>
          <span className="rounded-btn bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
            {soldOut ? 'View Event' : 'Book Tickets'}
          </span>
        </div>
      </div>
    </Link>
  );
}
