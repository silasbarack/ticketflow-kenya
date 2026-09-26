'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Drama, Headphones, LayoutDashboard, MapPin, Martini, Megaphone, Music2, PartyPopper, QrCode, Search,
  Settings2, ShieldCheck, Smartphone, Sparkles, Star, Ticket, Trophy, UsersRound, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import Logo from '@/components/Logo';
import SiteQrCode from '@/components/SiteQrCode';
import EventCard from '@/components/EventCard';
import Reveal, { CountUp } from '@/components/Reveal';
import { EventCardSkeletonGrid } from '@/components/ui/Skeleton';

const CATEGORIES = [
  { label: 'Concerts', icon: Music2, href: '/events?category=music' },
  { label: 'Festivals', icon: PartyPopper, href: '/events?category=festival' },
  { label: 'Theatre', icon: Drama, href: '/events?category=culture' },
  { label: 'Sports', icon: Trophy, href: '/events?category=sports' },
  { label: 'Conferences', icon: BriefcaseBusiness, href: '/events?category=technology' },
  { label: 'Nightlife', icon: Martini, href: '/events?category=nightlife' },
  { label: 'Family Events', icon: UsersRound, href: '/events?category=entertainment' },
];

const MARQUEE = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Diani', 'Naivasha', 'Thika', 'Nanyuki', 'Malindi'];

const WHY = [
  { icon: ShieldCheck, title: 'Secure Payments', text: 'Pay safely with M-Pesa STK Push — confirmed directly by Safaricom.' },
  { icon: Zap, title: 'Fast QR Ticket Delivery', text: 'Get your signed QR e-ticket instantly after payment, by email and in-app.' },
  { icon: BadgeCheck, title: 'Trusted Organizers', text: 'Every event is reviewed and approved before it goes on sale.' },
  { icon: Headphones, title: 'Easy Support', text: 'Need help? Our support team is here for you before and after the show.' },
];

const STEPS = [
  { icon: Search, title: 'Step 1 · Discover', text: 'Browse concerts, festivals, sports and more happening near you.' },
  { icon: Ticket, title: 'Step 2 · Choose', text: 'Pick your ticket tier and quantity — prices include every fee up front.' },
  { icon: Smartphone, title: 'Step 3 · Pay with M-Pesa', text: 'Confirm the STK prompt on your phone. No cards, no hassle.' },
  { icon: QrCode, title: 'Step 4 · Show up', text: 'Your QR ticket lands instantly. Scan at the gate and enjoy the moment.' },
];

function HeroSwoosh() {
  return (
    <svg className="tf-hero-swoosh" viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tf-swoosh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2a52" />
          <stop offset="1" stopColor="#b00022" />
        </linearGradient>
      </defs>
      <path d="M120 40h230a24 24 0 0 1 24 24v70a30 30 0 0 0 0 60v150a24 24 0 0 1-24 24H150C90 368 30 300 60 200 80 130 70 70 120 40Z" fill="url(#tf-swoosh)" />
      <path d="M300 50v320" stroke="#fff" strokeOpacity=".55" strokeWidth="5" strokeDasharray="12 14" strokeLinecap="round" />
      <path d="M0 330C90 330 150 300 210 230" stroke="#e6002d" strokeWidth="10" strokeLinecap="round" opacity=".35" />
      <path d="M10 370C120 372 200 330 250 270" stroke="#e6002d" strokeWidth="6" strokeLinecap="round" opacity=".25" />
    </svg>
  );
}

function StepsCard() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % STEPS.length), 4200);
    return () => window.clearInterval(id);
  }, [index]);
  const step = STEPS[index];
  const Icon = step.icon;
  return (
    <div className="tf-steps-card" aria-live="polite">
      <span className="tf-step-icon"><Icon size={24} /></span>
      <div className="tf-step-body" key={index}>
        <div className="tf-step-fade">
          <small>{step.title}</small>
          <p>{step.text}</p>
        </div>
        <div className="tf-step-dots" aria-hidden="true">{STEPS.map((s, i) => <i key={s.title} className={i === index ? 'on' : ''} />)}</div>
      </div>
      <div className="tf-step-nav">
        <button type="button" aria-label="Previous step" onClick={() => setIndex((i) => (i - 1 + STEPS.length) % STEPS.length)}><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Next step" onClick={() => setIndex((i) => (i + 1) % STEPS.length)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => (await api.get('/events', { params: { take: 30 } })).data as { events: EventItem[]; total: number },
  });

  const events = useMemo(() => {
    return (data?.events || [])
      .filter((event) => Date.parse(event.endDateTime) >= Date.now())
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }, [data]);

  const trending = events.slice(0, 5);
  const cities = new Set(events.map((event) => event.city.trim().toLowerCase())).size;
  const categories = new Set(events.map((event) => event.category?.slug)).size;

  return (
    <main className="tf-home">
      {/* ---------------- Hero ---------------- */}
      <section className="tf-hero">
        <div className="container-page tf-hero-grid">
          <div>
            <span className="tf-kicker tf-rise"><span className="tf-live-dot" /> Events bring us together</span>
            <h1 className="tf-rise" style={{ '--d': '80ms' } as React.CSSProperties}>
              Discover Kenya&apos;s<br />
              <span className="red">Best Events</span>
            </h1>
            <p className="tf-hero-lead tf-rise" style={{ '--d': '160ms' } as React.CSSProperties}>
              Book concerts, festivals, theatre, sports,
              conferences and amazing experiences across Kenya. Your next great moment is just a ticket away.
            </p>

            <form action="/events" className="tf-search tf-rise" style={{ '--d': '240ms' } as React.CSSProperties} aria-label="Search events">
              <label>
                <Music2 size={20} />
                <span><small>Event Type</small>
                  <select name="category" defaultValue="" aria-label="Event type">
                    <option value="">All Events</option>
                    <option value="music">Concerts</option>
                    <option value="festival">Festivals</option>
                    <option value="culture">Theatre &amp; Culture</option>
                    <option value="sports">Sports</option>
                    <option value="technology">Conferences</option>
                    <option value="nightlife">Nightlife</option>
                  </select>
                </span>
              </label>
              <label>
                <MapPin size={20} />
                <span><small>City</small>
                  <select name="city" defaultValue="" aria-label="City">
                    <option value="">Select City</option>
                    <option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option><option>Eldoret</option>
                  </select>
                </span>
              </label>
              <label>
                <CalendarDays size={20} />
                <span><small>Date</small>
                  <select name="date" defaultValue="" aria-label="Date">
                    <option value="">Any Date</option>
                    <option value="today">Today</option>
                    <option value="weekend">This Weekend</option>
                    <option value="month">Next 30 Days</option>
                  </select>
                </span>
              </label>
              <button type="submit" className="tf-shine"><Search size={17} /> Search Events</button>
            </form>

            <div className="tf-benefits tf-rise" style={{ '--d': '320ms' } as React.CSSProperties}>
              <div><ShieldCheck size={26} /><span><b>Secure Payments</b><small>Your data is safe with us</small></span></div>
              <div><Zap size={26} /><span><b>Instant E-Tickets</b><small>Get your tickets instantly</small></span></div>
              <div><Smartphone size={26} /><span><b>M-Pesa Support</b><small>Pay easily with M-Pesa</small></span></div>
            </div>
          </div>

          <div className="tf-hero-visual tf-rise" style={{ '--d': '200ms' } as React.CSSProperties}>
            <HeroSwoosh />
            <div className="tf-hero-photo">
              <Image src="/hero-party.jpg" alt="Crowd celebrating at a live concert in Kenya" fill priority sizes="(max-width: 1080px) 80vw, 40vw" />
            </div>
            <div className="tf-script tf-hero-script-a">Good Events<br /><b>Brighter People</b></div>
            <div className="tf-phone" aria-hidden="true">
              <div className="tf-phone-screen">
                <span className="tf-phone-notch" />
                <Logo variant="stacked" theme="light" />
                <div className="tf-phone-qr"><SiteQrCode /></div>
                <span className="tf-script">Good Events<br /><b>Brighter People</b></span>
                <span className="tf-phone-chip">ADMIT ONE · VIP</span>
              </div>
            </div>
            <div className="tf-hero-toast" aria-hidden="true">
              <span><CheckCircle2 size={20} /></span>
              <span><b>Payment confirmed</b><small>Your QR ticket is ready 🎉</small></span>
            </div>
            <div className="tf-script tf-hero-script-b">Events Make A<br /><b>Brighter Kenya</b></div>
          </div>
        </div>
      </section>

      <div className="tf-marquee" aria-hidden="true">
        <div className="tf-marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {MARQUEE.map((city) => <span key={city + copy}><Sparkles size={14} /> {city}</span>)}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- Categories ---------------- */}
      <section className="tf-section tf-categories" id="categories">
        <div className="container-page">
          <Reveal className="tf-cat-shell">
            <div className="tf-cat-intro"><b>Browse by Category</b><small>Find events that match your vibe.</small></div>
            <div className="tf-cat-row">
              {CATEGORIES.map(({ label, icon: Icon, href }) => (
                <Link key={label} href={href} className="tf-cat"><Icon strokeWidth={1.8} /><span>{label}</span></Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Trending ---------------- */}
      <section className="tf-section" style={{ paddingTop: 8 }}>
        <div className="container-page">
          <Reveal className="tf-section-head">
            <div><h2>Trending Events</h2><p>Hot events happening across Kenya</p></div>
            <Link href="/events" className="tf-link">View All Events <ArrowRight size={16} /></Link>
          </Reveal>
          {isLoading && trending.length === 0 ? (
            <EventCardSkeletonGrid count={5} />
          ) : (
            <div className="tf-event-grid tf-trending">
              {trending.map((event, index) => (
                <Reveal key={event.id} delay={index * 90} className="flex">
                  <EventCard event={event} priority={index < 3} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Why ---------------- */}
      <section className="tf-section" id="about" style={{ paddingTop: 8 }}>
        <div className="container-page">
          <Reveal className="tf-section-head">
            <div><h2>Why Book With TicketFlow Kenya?</h2><p>A safer, simpler and better way to experience live events.</p></div>
          </Reveal>
          <div className="tf-why-grid">
            {WHY.map(({ icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 90} className="tf-why-card">
                <span className="tf-why-icon"><Icon size={24} /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Organizers ---------------- */}
      <section className="tf-organizer" id="for-organizers">
        <div className="container-page">
          <Reveal className="tf-org-shell">
            <div className="tf-org-photo">
              <Image src="/hero-party.jpg" alt="A packed audience at a TicketFlow event" fill sizes="(max-width: 760px) 100vw, 32vw" style={{ objectPosition: '70% 70%' }} />
              <span className="tf-script">More People<br />More <b>Possibilities</b></span>
            </div>
            <div className="tf-org-copy">
              <span className="eyebrow">For event organizers</span>
              <h2>Sell Tickets With Ease</h2>
              <p>Reach more people, boost your sales and create amazing events with TicketFlow Kenya. Our platform gives you the tools to manage your events from start to finish.</p>
              <Link href="/register" className="primary-cta tf-shine">List Your Event <ArrowRight size={17} /></Link>
            </div>
            <div className="tf-org-features">
              <span><LayoutDashboard size={20} /> Simple event management</span>
              <span><Megaphone size={20} /> Access a wider audience</span>
              <span><Ticket size={20} /> Secure ticketing &amp; payments</span>
              <span><Settings2 size={20} /> Dedicated support</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Trust ---------------- */}
      <section className="tf-trust">
        <div className="container-page tf-trust-shell">
          <Reveal className="tf-stats">
            <div className="tf-stats-title">Loved by event lovers across Kenya</div>
            <div className="tf-stats-grid">
              <div className="tf-stat"><CalendarDays size={26} /><span><b><CountUp value={events.length} /></b><small>Upcoming Events</small></span></div>
              <div className="tf-stat"><MapPin size={26} /><span><b><CountUp value={cities} /></b><small>Cities Across Kenya</small></span></div>
              <div className="tf-stat"><Star size={26} /><span><b><CountUp value={categories} /></b><small>Event Categories</small></span></div>
              <div className="tf-stat"><QrCode size={26} /><span><b>24/7</b><small>Ticket Access</small></span></div>
            </div>
          </Reveal>
          <Reveal delay={120}><StepsCard /></Reveal>
        </div>
      </section>
    </main>
  );
}
