'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Info, MapPin, Minus, Plus, ShieldCheck, Ticket, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventItem, TicketType } from '@/types';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/format';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getTierStatus, sortTiers, tierLabel } from '@/lib/tiers';

function eventDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

function eventTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

const TIER_STATUS_LABEL: Record<string, string> = {
  SOLD_OUT: 'Sold out',
  CLOSED: 'Sales closed',
  NOT_YET_ON_SALE: 'Not yet on sale',
};

function tierDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(value));
}

export default function EventDetailClient({ initialEvent }: { initialEvent: EventItem | null }) {
  const event = initialEvent;
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Recorded only if the user opted in to personalisation (checked server-side).
  useEffect(() => {
    if (user && event?.id) api.post(`/discovery/me/views/${event.id}`).catch(() => undefined);
  }, [user, event?.id]);
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

  const tiers = sortTiers(event.ticketTypes);
  const onSale = tiers.filter((tier) => getTierStatus(tier) === 'AVAILABLE');
  const lowest = onSale.length ? Math.min(...onSale.map((item) => Number(item.price))) : 0;

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
            {event.isDemo && (
              <p className="event-checkout-note"><Info size={15} /> TicketFlow sample listing — a showcase event, not yet a confirmed booking.</p>
            )}
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
              {tiers.map((tier) => {
                const qty = quantities[tier.id] || 1;
                const status = getTierStatus(tier);
                const available = status === 'AVAILABLE';
                return (
                  <div key={tier.id} className={'ticket-tier' + (available ? '' : ' unavailable')}>
                    <div>
                      <small className={'tier-chip tier-' + tier.category.toLowerCase()}>{tierLabel(tier.category)}</small>
                      <b>{tier.name}</b>
                      <span>{formatCurrency(tier.price)}</span>
                      {tier.description && <em>{tier.description}</em>}
                      {available && tier.salesEnd && <em>Sales end {tierDateLabel(tier.salesEnd)}</em>}
                    </div>
                    {available ? (
                      <div className="tier-actions">
                        <div className="qty-control">
                          <button onClick={() => setQuantities((current) => ({ ...current, [tier.id]: Math.max(1, qty - 1) }))} aria-label="Decrease quantity"><Minus size={15} /></button>
                          <span>{qty}</span>
                          <button onClick={() => setQuantities((current) => ({ ...current, [tier.id]: Math.min(10, qty + 1) }))} aria-label="Increase quantity"><Plus size={15} /></button>
                        </div>
                        <button className="add-ticket-button" onClick={() => addTier(tier)}>Add</button>
                      </div>
                    ) : (
                      <span className="tier-status">{TIER_STATUS_LABEL[status] ?? 'Unavailable'}</span>
                    )}
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
