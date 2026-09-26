'use client';

import Link from 'next/link';
import { CalendarDays, Heart, MapPin, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventItem } from '@/types';
import { formatCurrency } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import EventPoster from '@/components/EventPoster';

function cardDate(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(date),
    month: new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(date).toUpperCase(),
    label: new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(date),
  };
}

export default function EventCard({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(event.id);
  const date = cardDate(event.startDateTime);
  const prices = event.ticketTypes.map((tier) => Number(tier.price)).filter((price) => Number.isFinite(price) && price > 0);
  const price = prices.length ? Math.min(...prices) : null;
  const url = '/events/' + event.slug;

  async function share(clickEvent: React.MouseEvent) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    const absolute = window.location.origin + url;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url: absolute });
      else {
        await navigator.clipboard.writeText(absolute);
        toast.success('Event link copied');
      }
    } catch {}
  }

  return (
    <article className="ref-event-card relative">
      <Link href={url} className="ref-event-poster">
        <EventPoster src={event.posterUrl} alt={event.posterAlt || event.title} priority={priority} objectPosition="center" />
        <span className="ref-event-date"><b>{date.day}</b><small>{date.month}</small></span>
      </Link>

      <div className="absolute left-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          className={'grid h-8 w-8 place-items-center rounded-full bg-white shadow-soft ' + (favorite ? 'text-brand-600' : 'text-navy-700')}
          aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={(e) => { e.preventDefault(); toggleFavorite(event.id); }}
        >
          <Heart size={14} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white text-navy-700 shadow-soft" aria-label="Share event" onClick={share}>
          <Share2 size={14} />
        </button>
      </div>

      <div className="ref-event-info">
        <p className="!mb-1 !text-brand-700 !font-black !uppercase !tracking-[.08em]">{event.category?.name || 'Event'}</p>
        <Link href={url}><h3>{event.title}</h3></Link>
        <p><MapPin /> {event.venue}</p>
        <p><CalendarDays /> {date.label}</p>
        <p><MapPin /> {event.city}</p>
        <div className="ref-event-price">From <b>{price ? formatCurrency(price) : 'View tickets'}</b></div>
        <Link href={url} className="ref-get-ticket">Get Tickets</Link>
      </div>
    </article>
  );
}
