'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowUpRight, CalendarDays, Heart, MapPin, Share2, Ticket } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import EventPoster from '@/components/EventPoster';
import Badge from '@/components/ui/Badge';
import { getTierStatus, sortTiers } from '@/lib/tiers';

export default function EventCard({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(event.id);
  const eventUrl = `/events/${event.slug}`;
  const tiers = sortTiers(event.ticketTypes);
  const availableTiers = tiers.filter((tier) => getTierStatus(tier) === 'AVAILABLE');
  const startingPrice = availableTiers.length ? Math.min(...availableTiers.map((tier) => Number(tier.price))) : null;
  const totalAvailable = tiers.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.quantitySold), 0);
  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  const internalBookable = event.isBookable !== false && !externalBooking;
  const soldOut = tiers.length > 0 && tiers.every((tier) => getTierStatus(tier) === 'SOLD_OUT');
  const sellingFast = internalBookable && totalAvailable > 0 && totalAvailable <= 15;

  function handleToggleFavorite(clickEvent: React.MouseEvent) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    toggleFavorite(event.id);
    toast.success(favorite ? 'Removed from favourites' : 'Added to favourites', { duration: 1500 });
  }

  async function handleShare(clickEvent: React.MouseEvent) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    const url = `${window.location.origin}${eventUrl}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Event link copied', { duration: 1500 }); }
    } catch { /* dismissed share sheet */ }
  }

  return (
    <article className="event-card-premium group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft transition-[border-color,box-shadow,transform] duration-200 hover:border-brand-200 hover:shadow-card focus-within:border-brand-300">
      <div className="relative">
        <Link href={eventUrl} className="block focus-visible:outline-none" aria-label={`View ${event.title}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-surface sm:aspect-[16/11]">
            <EventPoster src={event.posterUrl} alt={event.posterAlt || `${event.title} event poster`} priority={priority} objectPosition="center 40%" className="transition duration-500 group-hover:scale-[1.035]" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />
          </div>
        </Link>

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
          <Badge tone={soldOut ? 'neutral' : sellingFast ? 'warning' : internalBookable ? 'success' : 'neutral'} className="bg-white/95 shadow-soft">
            {externalBooking ? 'Official listing' : soldOut ? 'Sold out' : sellingFast ? `${totalAvailable} left` : internalBookable && availableTiers.length ? 'Tickets available' : 'Sales closed'}
          </Badge>
        </div>

        <div className="absolute right-3 top-3 flex gap-1.5">
          <button type="button" onClick={handleToggleFavorite} aria-label={favorite ? `Remove ${event.title} from favourites` : `Add ${event.title} to favourites`} aria-pressed={favorite} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-soft transition hover:text-brand-700"><Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
          <button type="button" onClick={handleShare} aria-label={`Share ${event.title}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-soft transition hover:text-brand-700"><Share2 className="h-4 w-4" aria-hidden="true" /></button>
        </div>

      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-700">{event.category?.name}</p>
        <Link href={eventUrl} className="mt-2 block"><h3 className="line-clamp-2 text-[17px] font-black leading-snug tracking-[-0.022em] text-navy-900 transition group-hover:text-brand-700 sm:text-[18px]">{event.title}</h3></Link>

        <div className="mb-4 mt-3 space-y-2 text-[13px] text-muted">
          <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" /><span>{formatDateTime(event.startDateTime)}</span></p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" /><span className="line-clamp-1">{event.venue}, {event.city}</span></p>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-[11px] text-muted">{startingPrice !== null ? 'Tickets from' : tiers.length ? 'Ticket status' : 'Tickets'}</p>
            <p className="tnum mt-0.5 text-base font-extrabold text-navy-900">{startingPrice !== null ? formatCurrency(startingPrice) : tiers.length ? 'Unavailable' : 'To be announced'}</p>
          </div>
          <Link href={eventUrl} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-50 px-4 text-xs font-extrabold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
            {internalBookable ? <><Ticket className="h-3.5 w-3.5" aria-hidden="true" />View tickets</> : <>View details<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></>}
          </Link>
        </div>
      </div>
    </article>
  );
}
