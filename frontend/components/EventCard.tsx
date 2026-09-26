'use client';

import Link from 'next/link';
import { CalendarDays, Heart, MapPin, Share2, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventItem } from '@/types';
import { formatCurrency } from '@/lib/format';
import { useFavorites } from '@/hooks/useFavorites';
import EventPoster from '@/components/EventPoster';

export function cardDate(value: string) {
  const date = new Date(value);
  const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-KE', { ...options, timeZone: 'Africa/Nairobi' }).format(date);
  return {
    day: fmt({ day: '2-digit' }),
    month: fmt({ month: 'short' }).toUpperCase(),
    label: fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

export function lowestPrice(event: EventItem) {
  const prices = event.ticketTypes.map((tier) => Number(tier.price)).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}

export default function EventCard({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(event.id);
  const date = cardDate(event.startDateTime);
  const price = lowestPrice(event);
  const url = '/events/' + event.slug;

  async function share() {
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
    <article className="tf-event-card">
      <Link href={url} className="tf-event-poster" aria-label={event.title}>
        <EventPoster
          src={event.posterUrl}
          alt={event.posterAlt || event.title}
          priority={priority}
          objectPosition="center"
          sizes="(max-width: 760px) 80vw, (max-width: 1080px) 33vw, 20vw"
        />
        <span className="tf-date"><small>{date.month}</small><b>{date.day}</b></span>
        {event.category?.name && <span className="tf-card-cat">{event.category.name}</span>}
      </Link>

      <div className="tf-card-actions">
        <button
          type="button"
          className={favorite ? 'on' : ''}
          aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(event.id)}
        >
          <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" aria-label="Share event" onClick={share}><Share2 size={15} /></button>
      </div>

      <div className="tf-event-info">
        <Link href={url}><h3>{event.title}</h3></Link>
        <p><MapPin /> <span>{event.venue}</span></p>
        <p><CalendarDays /> <span>{date.label}</span></p>
        <p><MapPin /> <span>{event.city}</span></p>
        <div className="tf-price">{price ? <>From <b>{formatCurrency(price)}</b></> : <b>View tickets</b>}</div>
        <Link href={url} className="tf-get-btn">Get Tickets <Ticket size={15} /></Link>
      </div>
    </article>
  );
}
