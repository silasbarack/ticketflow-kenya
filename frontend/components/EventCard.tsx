'use client';

import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency } from '@/lib/format';
import EventPoster from '@/components/EventPoster';

function cardDate(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(date),
    month: new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(date).toUpperCase(),
    label: new Intl.DateTimeFormat('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Nairobi',
    }).format(date),
  };
}

export default function EventCard({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  const date = cardDate(event.startDateTime);
  const prices = event.ticketTypes
    .map((tier) => Number(tier.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const startingPrice = prices.length ? Math.min(...prices) : null;
  const external = event.bookingMode === 'EXTERNAL';

  return (
    <article className="ref-event-card">
      <Link href={'/events/' + event.slug} className="ref-event-poster" aria-label={'View ' + event.title}>
        <EventPoster
          src={event.posterUrl}
          alt={event.posterAlt || event.title}
          priority={priority}
          objectPosition="center"
          className="ref-event-poster-image"
        />
        <span className="ref-event-date"><b>{date.day}</b><small>{date.month}</small></span>
      </Link>

      <div className="ref-event-info">
        <span className="ref-event-category">{event.category?.name || 'Event'}</span>
        <Link href={'/events/' + event.slug}><h3>{event.title}</h3></Link>
        <p><MapPin /> <span>{event.venue}, {event.city}</span></p>
        <p><CalendarDays /> <span>{date.label}</span></p>
        <div className="ref-event-price">
          <span>{startingPrice ? <>From <b>{formatCurrency(startingPrice)}</b></> : <b>View ticket details</b>}</span>
        </div>
        <Link href={'/events/' + event.slug} className="ref-get-ticket">
          {external ? 'View Tickets' : 'Get Tickets'}
        </Link>
      </div>
    </article>
  );
}
