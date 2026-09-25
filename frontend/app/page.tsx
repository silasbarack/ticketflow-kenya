'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, MapPin, QrCode, Search, ShieldCheck, Smartphone, Sparkles, TicketCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import { getCuratedUpcoming } from '@/lib/curated-events';
import EventGrid from '@/components/EventGrid';
import OrganizerCTA from '@/components/OrganizerCTA';

const categories = ['Music', 'Sports', 'Nightlife', 'Culture', 'Festival', 'Technology'];

export default function HomePage() {
  const curated = getCuratedUpcoming();
  const { data } = useQuery({
    queryKey: ['home-events-new-ui'],
    queryFn: async () => (await api.get('/events', { params: { take: 24 } })).data as { events: EventItem[]; total: number },
  });

  const apiEvents = (data?.events || []).filter((event) => Date.parse(event.endDateTime) >= Date.now());
  const seen = new Set(curated.map((event) => event.slug));
  const allEvents = [...curated, ...apiEvents.filter((event) => !seen.has(event.slug))]
    .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  const heroEvent = allEvents[0] || curated[0];

  return (
    <main className="fresh-home">
      <section className="home-hero">
        <div className="container-page home-hero-grid">
          <div className="home-hero-copy">
            <span className="hero-pill"><Sparkles size={15} /> Kenya is happening now</span>
            <h1>Plans worth<br /><span>leaving the house for.</span></h1>
            <p>Discover verified upcoming experiences across Kenya, compare dates and prices, and move from “what are we doing?” to booked.</p>
            <div className="hero-actions">
              <Link href="/events" className="primary-cta">Explore events <ArrowRight size={18} /></Link>
              <Link href="/register" className="secondary-cta">List your event</Link>
            </div>
            <div className="hero-trust-row">
              <span><ShieldCheck size={16} /> Verified listings</span>
              <span><Smartphone size={16} /> M-Pesa ready</span>
              <span><QrCode size={16} /> QR tickets</span>
            </div>
          </div>

          {heroEvent && (
            <Link href={'/events/' + heroEvent.slug} className="hero-event-card">
              <Image src={heroEvent.posterUrl || '/hero-party.jpg'} alt={heroEvent.posterAlt || heroEvent.title} fill priority sizes="(max-width: 900px) 100vw, 46vw" className="hero-event-image" />
              <div className="hero-event-shade" />
              <div className="hero-event-date">
                <b>{new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(heroEvent.startDateTime))}</b>
                <span>{new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(heroEvent.startDateTime)).toUpperCase()}</span>
              </div>
              <div className="hero-event-content">
                <span>{heroEvent.category.name}</span>
                <h2>{heroEvent.title}</h2>
                <p><MapPin size={15} /> {heroEvent.venue}, {heroEvent.city}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="quick-find-wrap">
        <div className="container-page">
          <form action="/events" className="quick-find">
            <div className="quick-find-field"><Search size={18} /><input name="q" placeholder="Search events, artists or venues" aria-label="Search events" /></div>
            <div className="quick-find-field"><MapPin size={18} /><select name="city" aria-label="Choose city"><option value="">Anywhere in Kenya</option><option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Eldoret</option><option>Thika</option></select></div>
            <button type="submit">Find events</button>
          </form>
          <div className="category-strip" aria-label="Browse categories">
            {categories.map((name) => <Link key={name} href={'/events?category=' + encodeURIComponent(name.toLowerCase())}>{name}</Link>)}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="container-page">
          <div className="section-heading-row">
            <div>
              <span className="section-eyebrow">Calendar picks</span>
              <h2>What’s next in Kenya</h2>
              <p>Current listings ordered by date, with source links for externally ticketed events.</p>
            </div>
            <Link href="/events" className="text-link">View full calendar <ArrowUpRight size={17} /></Link>
          </div>
          <EventGrid events={allEvents.slice(0, 8)} />
        </div>
      </section>

      <section className="calendar-band">
        <div className="container-page">
          <div className="calendar-band-copy">
            <span className="section-eyebrow light">This month</span>
            <h2>Your weekend should not start with 17 open tabs.</h2>
            <p>TicketFlow puts dates, venues, cities, ticket prices and booking paths in one clean mobile-first view.</p>
            <Link href="/events" className="white-cta">Open the event calendar <CalendarDays size={18} /></Link>
          </div>
          <div className="calendar-list">
            {allEvents.slice(0, 4).map((event) => (
              <Link key={event.id} href={'/events/' + event.slug}>
                <span className="calendar-date-box">
                  <b>{new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(event.startDateTime))}</b>
                  <small>{new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(event.startDateTime)).toUpperCase()}</small>
                </span>
                <span className="calendar-list-copy"><b>{event.title}</b><small>{event.venue} · {event.city}</small></span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section trust-section">
        <div className="container-page">
          <div className="section-heading-row compact">
            <div><span className="section-eyebrow">Built for real plans</span><h2>From discovery to the gate.</h2></div>
          </div>
          <div className="trust-grid">
            <article><span><Search /></span><h3>Discover clearly</h3><p>Browse by date, city and category without fighting through clutter.</p></article>
            <article><span><TicketCheck /></span><h3>Book confidently</h3><p>TicketFlow-hosted events can support secure checkout and clear ticket tiers.</p></article>
            <article><span><Smartphone /></span><h3>Pay the Kenyan way</h3><p>M-Pesa-first checkout keeps the experience familiar on mobile.</p></article>
            <article><span><QrCode /></span><h3>Scan and enter</h3><p>Digital QR tickets are ready for fast validation at the entrance.</p></article>
          </div>
          <div className="listing-note"><CheckCircle2 size={18} /><span>Externally ticketed calendar events are clearly labelled and link to their listed ticket source.</span></div>
        </div>
      </section>

      <OrganizerCTA />
    </main>
  );
}
