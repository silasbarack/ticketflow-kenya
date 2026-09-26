'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, MapPin, Minus, Plus, ShieldCheck, Ticket, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventItem, TicketType } from '@/types';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';

function eventDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

function eventTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

export default function EventDetailClient({ initialEvent }: { initialEvent: EventItem | null }) {
  const event = initialEvent;
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!event) {
    return (
      <main className="event-not-found">
        <div className="container-page">
          <span className="section-eyebrow">Event unavailable</span>
          <h1>We could not find that event.</h1>
          <p>It may have ended, moved, or no longer be publicly listed.</p>
          <Link href="/events" className="primary-cta"><ArrowLeft size={18} /> Back to events</Link>
        </div>
      </main>
    );
  }

  const lowest = event.ticketTypes.length ? Math.min(...event.ticketTypes.map((item) => Number(item.price))) : 0;

  const addTier = (tier: TicketType) => {
    const quantity = quantities[tier.id] || 1;
    addToCart({
      eventId: event.id,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventDateTime: event.startDateTime,
      eventVenue: event.venue,
      eventCity: event.city,
      ticketTypeId: tier.id,
      ticketTypeName: tier.name,
      ticketTypeCategory: tier.category,
      price: Number(tier.price),
      quantity,
    });
    toast.success(quantity + ' ticket' + (quantity > 1 ? 's' : '') + ' added to cart');
  };

  return (
    <main className="event-detail-page">
      <div className="container-page">
        <Link href="/events" className="event-back-link"><ArrowLeft size={17} /> Back to events</Link>
        <section className="event-detail-hero">
          <div className="event-detail-media">
            <Image src={event.posterUrl || '/hero-party.jpg'} alt={event.posterAlt || event.title} fill priority sizes="(max-width: 900px) 100vw, 55vw" />
            <span className="event-detail-category">{event.category.name}</span>
          </div>
          <div className="event-detail-copy">
            {event.isFeatured && <span className="detail-featured"><CheckCircle2 size={15} /> Calendar pick</span>}
            <h1>{event.title}</h1>
            {event.subtitle && <p className="event-subtitle">{event.subtitle}</p>}
            <div className="event-facts">
              <div><span><CalendarDays /></span><p><b>{eventDateLabel(event.startDateTime)}</b><small>{eventTimeLabel(event.startDateTime)} EAT</small></p></div>
              <div><span><MapPin /></span><p><b>{event.venue}</b><small>{event.address || event.city}</small></p></div>
              <div><span><Ticket /></span><p><b>{lowest > 0 ? 'From ' + formatCurrency(lowest) : 'Ticket information available'}</b><small>TicketFlow checkout</small></p></div>
            </div>
            <Link href="#tickets" className="primary-cta">Choose tickets <ArrowUpRight size={18} /></Link>
            <p className="event-checkout-note"><ShieldCheck size={15} /> Tickets are sold only on TicketFlow Kenya — pay by M-Pesa and get your QR ticket instantly.</p>
          </div>
        </section>

        <section className="event-detail-body">
          <article className="event-about">
            <span className="section-eyebrow">About this event</span>
            <h2>Know before you go</h2>
            <p>{event.description}</p>
            <div className="event-meta-grid">
              <div><Users /><span><b>Organizer</b><small>{event.organizerName || event.organizer?.companyName || 'Event organizer'}</small></span></div>
              <div><Clock3 /><span><b>Starts</b><small>{eventTimeLabel(event.startDateTime)} EAT</small></span></div>
              <div><MapPin /><span><b>City</b><small>{event.city}, Kenya</small></span></div>
            </div>
          </article>

          <aside id="tickets" className="ticket-panel">
            <span className="section-eyebrow">Tickets</span>
            <h2>Choose your experience</h2>
            <div className="ticket-tier-list">
              {event.ticketTypes.map((tier) => {
                const qty = quantities[tier.id] || 1;
                return (
                  <div key={tier.id} className="ticket-tier">
                    <div><b>{tier.name}</b><span>{formatCurrency(tier.price)}</span></div>
                    <div className="tier-actions">
                      <div className="qty-control">
                        <button onClick={() => setQuantities((current) => ({ ...current, [tier.id]: Math.max(1, qty - 1) }))} aria-label="Decrease quantity"><Minus size={15} /></button>
                        <span>{qty}</span>
                        <button onClick={() => setQuantities((current) => ({ ...current, [tier.id]: Math.min(10, qty + 1) }))} aria-label="Increase quantity"><Plus size={15} /></button>
                      </div>
                      <button className="add-ticket-button" onClick={() => addTier(tier)}>Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/cart" className="primary-cta full">Go to cart <ArrowUpRight size={18} /></Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
