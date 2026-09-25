'use client';

import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Heart, MapPin, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventItem } from '@/types';
import { formatCurrency } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import EventPoster from '@/components/EventPoster';

function dayParts(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(date),
    month: new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(date).toUpperCase(),
    long: new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(date),
  };
}

export default function EventCard({ event, priority=false }: { event: EventItem; priority?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(event.id);
  const date = dayParts(event.startDateTime);
  const prices = event.ticketTypes.map(t => Number(t.price)).filter(n => Number.isFinite(n) && n > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;

  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + '/events/' + event.slug;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Event link copied'); }
    } catch {}
  };

  return (
    <article className="fresh-event-card">
      <Link href={'/events/' + event.slug} className="fresh-event-media" aria-label={'View ' + event.title}>
        <EventPoster src={event.posterUrl} alt={event.posterAlt || event.title} priority={priority} className="fresh-event-image" objectPosition="center" />
        <span className="fresh-date-badge"><b>{date.day}</b><small>{date.month}</small></span>
        <span className="fresh-category-badge">{event.category?.name || 'Event'}</span>
      </Link>
      <div className="fresh-event-actions">
        <button
          type="button"
          aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={(e) => { e.preventDefault(); toggleFavorite(event.id); }}
          className={favorite ? 'active' : ''}
        ><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
        <button type="button" aria-label="Share event" onClick={share}><Share2 size={17} /></button>
      </div>
      <div className="fresh-event-body">
        <p className="fresh-event-time"><CalendarDays size={15} /> {date.long}</p>
        <Link href={'/events/' + event.slug}><h3>{event.title}</h3></Link>
        <p className="fresh-event-place"><MapPin size={15} /><span>{event.venue}, {event.city}</span></p>
        <div className="fresh-event-footer">
          <div>
            <small>{minPrice ? 'From' : 'Tickets'}</small>
            <b>{minPrice ? formatCurrency(minPrice) : 'View details'}</b>
          </div>
          <Link href={'/events/' + event.slug}>Details <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
