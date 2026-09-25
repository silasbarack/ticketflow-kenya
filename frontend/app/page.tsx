'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarDays,
  ChevronRight, Drama, Headphones, MapPin, Music2, MoonStar, PartyPopper,
  QrCode, Search, ShieldCheck, Smartphone, Trophy, UsersRound, Zap
} from 'lucide-react';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import { getCuratedUpcoming } from '@/lib/curated-events';
import Logo from '@/components/Logo';
import { formatCurrency } from '@/lib/format';

const categories = [
  { label: 'Concerts', icon: Music2, href: '/events?category=music' },
  { label: 'Festivals', icon: PartyPopper, href: '/events?category=festival' },
  { label: 'Theatre', icon: Drama, href: '/events?category=culture' },
  { label: 'Sports', icon: Trophy, href: '/events?category=sports' },
  { label: 'Conferences', icon: BriefcaseBusiness, href: '/events?category=technology' },
  { label: 'Nightlife', icon: MoonStar, href: '/events?category=nightlife' },
  { label: 'Family Events', icon: UsersRound, href: '/events?category=entertainment' },
];

function lowestPrice(event: EventItem) {
  const prices = event.ticketTypes.map((tier) => Number(tier.price)).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}

function shortDate(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(date),
    month: new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(date).toUpperCase(),
    label: new Intl.DateTimeFormat('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi'
    }).format(date),
  };
}

export default function HomePage() {
  const curated = getCuratedUpcoming();
  const { data } = useQuery({
    queryKey: ['reference-home-events'],
    queryFn: async () => (await api.get('/events', { params: { take: 30 } })).data as { events: EventItem[]; total: number },
  });

  const apiEvents = (data?.events || []).filter((event) => Date.parse(event.endDateTime) >= Date.now());
  const known = new Set(curated.map((event) => event.slug));
  const events = [...curated, ...apiEvents.filter((event) => !known.has(event.slug))]
    .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  const trending = events.slice(0, 5);

  return (
    <main className="ref-home">
      <section className="ref-hero">
        <div className="container-page ref-hero-grid">
          <div className="ref-hero-copy">
            <span className="ref-kicker">EVENTS BRING US TOGETHER</span>
            <h1>Discover Kenya&apos;s<br /><strong>Best Events</strong></h1>
            <p>Book concerts, festivals, theatre, conferences, sports and memorable experiences across Kenya. Your next great moment is just a ticket away.</p>

            <form action="/events" className="ref-hero-search" aria-label="Search events">
              <label>
                <Music2 size={18} />
                <span><small>Event Type</small><select name="category" defaultValue=""><option value="">All Events</option><option value="music">Music</option><option value="festival">Festivals</option><option value="sports">Sports</option><option value="culture">Theatre & Culture</option><option value="technology">Conferences</option></select></span>
              </label>
              <label>
                <MapPin size={18} />
                <span><small>City</small><select name="city" defaultValue=""><option value="">Select City</option><option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Eldoret</option></select></span>
              </label>
              <label>
                <CalendarDays size={18} />
                <span><small>Date</small><select name="date" defaultValue=""><option value="">Any Date</option><option value="weekend">This Weekend</option><option value="month">This Month</option></select></span>
              </label>
              <button type="submit"><Search size={17} /> Search Events</button>
            </form>

            <div className="ref-hero-benefits">
              <span><ShieldCheck /> <b>Secure Payments</b><small>Your data stays protected.</small></span>
              <span><Zap /> <b>Instant E-Tickets</b><small>Get your ticket immediately.</small></span>
              <span><Smartphone /> <b>M-Pesa Support</b><small>Pay easily from your phone.</small></span>
            </div>
          </div>

          <div className="ref-hero-visual">
            <Image src="/hero-party.jpg" alt="People enjoying an event in Kenya" fill priority sizes="(max-width: 900px) 100vw, 48vw" className="ref-hero-photo" />
            <div className="ref-hero-overlay" />
            <div className="ref-handwritten ref-handwritten-one">Good Events<br /><b>Brighter People</b></div>
            <div className="ref-handwritten ref-handwritten-two">Events Make<br /><b>A Brighter Kenya</b></div>
            <div className="ref-phone">
              <div className="ref-phone-speaker" />
              <Logo className="h-12" />
              <QrCode size={84} strokeWidth={1.4} />
              <span>YOUR E-TICKET</span>
              <small>Scan at the entrance</small>
            </div>
          </div>
        </div>
      </section>

      <section className="ref-category-zone" id="categories">
        <div className="container-page ref-category-shell">
          <div className="ref-category-intro"><b>Browse by<br />Category</b><small>Find events that match your vibe.</small></div>
          <div className="ref-category-row">
            {categories.map(({ label, icon: Icon, href }) => (
              <Link key={label} href={href}><Icon /><span>{label}</span></Link>
            ))}
          </div>
          <Link href="/events" className="ref-category-next" aria-label="View all categories"><ChevronRight /></Link>
        </div>
      </section>

      <section className="ref-section">
        <div className="container-page">
          <div className="ref-section-head">
            <div><h2>Trending Events</h2><p>Hot events happening across Kenya</p></div>
            <Link href="/events">View All Events <ArrowRight /></Link>
          </div>

          <div className="ref-trending-grid">
            {trending.map((event) => {
              const date = shortDate(event.startDateTime);
              const price = lowestPrice(event);
              return (
                <article key={event.id} className="ref-event-card">
                  <Link href={'/events/' + event.slug} className="ref-event-poster">
                    <Image src={event.posterUrl || '/hero-party.jpg'} alt={event.posterAlt || event.title} fill sizes="(max-width: 700px) 50vw, 20vw" />
                    <span className="ref-event-date"><b>{date.day}</b><small>{date.month}</small></span>
                  </Link>
                  <div className="ref-event-info">
                    <Link href={'/events/' + event.slug}><h3>{event.title}</h3></Link>
                    <p><MapPin /> {event.venue}</p>
                    <p><CalendarDays /> {date.label}</p>
                    <p><MapPin /> {event.city}</p>
                    <div className="ref-event-price"><span>From <b>{price ? formatCurrency(price) : 'View tickets'}</b></span></div>
                    <Link href={'/events/' + event.slug} className="ref-get-ticket">Get Tickets</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ref-section ref-why" id="about">
        <div className="container-page">
          <div className="ref-section-head ref-section-head-left"><div><h2>Why Book With TicketFlow Kenya?</h2><p>A safer, simpler and better way to experience live events.</p></div></div>
          <div className="ref-why-grid">
            <article><span><ShieldCheck /></span><div><h3>Secure Payments</h3><p>Use trusted payment flows designed for safe ticket checkout.</p></div></article>
            <article><span><Zap /></span><div><h3>Fast QR Ticket Delivery</h3><p>Your TicketFlow QR ticket is available after successful payment.</p></div></article>
            <article><span><BadgeCheck /></span><div><h3>Trusted Organizers</h3><p>Organizer workflows include verification and event management tools.</p></div></article>
            <article><span><Headphones /></span><div><h3>Support When Needed</h3><p>Clear account, ticket and payment support paths are built into the platform.</p></div></article>
          </div>
        </div>
      </section>

      <section className="ref-organizer" id="for-organizers">
        <div className="container-page ref-organizer-shell">
          <div className="ref-organizer-photo">
            <Image src="/hero-party.jpg" alt="Event organizer using TicketFlow Kenya" fill sizes="(max-width: 800px) 100vw, 34vw" />
            <div className="ref-organizer-photo-overlay" />
            <span>More People.<br />More Tickets.<br /><b>More Possibilities.</b></span>
          </div>
          <div className="ref-organizer-copy">
            <span>FOR EVENT ORGANIZERS</span>
            <h2>Sell Tickets With Ease</h2>
            <p>Reach more people, manage ticket tiers and track your event from one TicketFlow workspace. Keep the setup simple and the guest experience smooth.</p>
            <Link href="/register">List Your Event <ArrowRight /></Link>
          </div>
          <div className="ref-organizer-features">
            <span><BriefcaseBusiness /> Simple event management</span>
            <span><UsersRound /> Reach a wider audience</span>
            <span><ShieldCheck /> Secure ticketing & payments</span>
            <span><Headphones /> Dedicated support tools</span>
          </div>
        </div>
      </section>

      <section className="ref-confidence">
        <div className="container-page">
          <div className="ref-confidence-title">Made for event lovers across Kenya</div>
          <div className="ref-confidence-grid">
            <span><UsersRound /><b>Mobile-first</b><small>Easy browsing on any screen</small></span>
            <span><QrCode /><b>QR Entry</b><small>Fast digital ticket validation</small></span>
            <span><MapPin /><b>Kenya-wide</b><small>Discover events by city</small></span>
            <span><ShieldCheck /><b>Secure by design</b><small>Protected payment workflows</small></span>
          </div>
          <div className="ref-confidence-quote">
            <div className="ref-avatar">TF</div>
            <div><b>Simple discovery. Clear booking. One place for your tickets.</b><small>TicketFlow Kenya platform experience</small></div>
            <ArrowUpRight />
          </div>
        </div>
      </section>
    </main>
  );
}
