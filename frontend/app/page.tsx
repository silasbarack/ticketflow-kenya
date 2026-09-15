'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, MapPin, QrCode, ShieldCheck, Smartphone, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { resolvePosterUrl } from '@/lib/posters';
import { SERVICE_FEE_PERCENT } from '@/lib/fees';
import { getTierStatus, sortTiers } from '@/lib/tiers';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import CategoryCard from '@/components/CategoryCard';
import FeaturedEvents from '@/components/FeaturedEvents';
import ProcessTimeline from '@/components/ProcessTimeline';
import OrganizerCTA from '@/components/OrganizerCTA';
import TrustSection from '@/components/TrustSection';
import HeroSearch from '@/components/HeroSearch';
import { EventCategory, EventItem } from '@/types';

const HERO_PROMISES = [
  { icon: Smartphone, text: 'M-Pesa STK Push' },
  { icon: QrCode, text: 'Instant QR tickets' },
  { icon: ShieldCheck, text: 'Verified organizers' },
];

export default function LandingPage() {
  const { data: eventsData } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => {
      const { data } = await api.get('/events', { params: { take: 50 } });
      return data as { events: EventItem[]; total: number };
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data as EventCategory[];
    },
  });

  const events = eventsData?.events ?? [];
  const cities = new Set(events.map((e) => e.city)).size;
  const cityCounts = Array.from(
    events.reduce(
      (counts, event) => counts.set(event.city, (counts.get(event.city) ?? 0) + 1),
      new Map<string, number>(),
    ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const spotlightEvent = events.find((e) => e.posterUrl) ?? events[0];

  const spotlightBookable =
    spotlightEvent && spotlightEvent.isBookable !== false && spotlightEvent.bookingMode !== 'EXTERNAL';
  const spotlightTiers = spotlightEvent ? sortTiers(spotlightEvent.ticketTypes) : [];
  const spotlightFrom = spotlightTiers.filter((t) => getTierStatus(t) === 'AVAILABLE')[0];

  return (
    <main>
      {/* ---------------------------------------------------------------- */}
      {/* Hero — night-event photo on the ember ground                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="ember-ground relative overflow-hidden text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/hero-party.jpg" alt="" fill priority unoptimized className="object-cover opacity-40" />
          {/* Keeps the headline at full contrast while the crowd still reads through. */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/45" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 to-transparent" />
        </div>

        <Container className="relative grid min-w-0 gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <span
              className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-semibold backdrop-blur"
              style={{ animationDelay: '0ms' }}
            >
              <Ticket className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              Kenya&apos;s event marketplace
            </span>

            <h1
              className="animate-fade-in-up mt-6 text-[38px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[56px] lg:text-[64px]"
              style={{ animationDelay: '80ms' }}
            >
              Find your next
              <br />
              <span className="ember-text">unmissable event.</span>
            </h1>

            <p
              className="animate-fade-in-up mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Concerts, festivals, theatre, sport and business events across Kenya. Pick your tier, pay with an M-Pesa
              STK push, and your signed QR e-ticket lands in your account instantly — no queues, no paper, no fakes at
              the gate.
            </p>

            <div className="animate-fade-in-up mt-8" style={{ animationDelay: '240ms' }}>
              <HeroSearch />
            </div>

            <div className="animate-fade-in-up mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: '300ms' }}>
              <Link href="/events">
                <Button variant="primary" size="lg">
                  Explore events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/[0.06] text-white hover:border-white/50 hover:bg-white/10"
                >
                  List your event
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-[13px] text-white/60 sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3">
              {HERO_PROMISES.map((promise) => (
                <span key={promise.text} className="flex items-center gap-2">
                  <promise.icon className="h-4 w-4 text-brand-400" aria-hidden="true" />
                  {promise.text}
                </span>
              ))}
            </div>
          </div>

          {/* Spotlight — one event, bookable straight from the hero */}
          <div className="relative hidden lg:block">
            {spotlightEvent ? (
              <div className="relative">
                <Link href={`/events/${spotlightEvent.slug}`} className="group relative block">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-panel border border-white/10 shadow-elevated">
                    {spotlightEvent.posterUrl ? (
                      <Image
                        src={resolvePosterUrl(spotlightEvent.posterUrl)}
                        alt={spotlightEvent.title}
                        fill
                        unoptimized
                        priority
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-950 p-8">
                        <span className="text-center text-xl font-bold text-white/90">
                          {spotlightEvent.title}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/95 to-transparent"
                      aria-hidden="true"
                    />
                    <span className="eyebrow absolute left-5 top-5 rounded-full bg-white/95 px-2.5 py-1.5 text-brand-700">
                      Spotlight
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-xl font-extrabold leading-tight text-white">
                        {spotlightEvent.title}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/70">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {spotlightEvent.venue}, {spotlightEvent.city}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Overlapping date / price card */}
                <div className="absolute -bottom-7 -left-7 flex items-center gap-4 rounded-card border border-line bg-white p-4 shadow-elevated">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700">
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{formatDate(spotlightEvent.startDateTime)}</p>
                    {spotlightFrom ? (
                      <p className="tnum text-xs text-muted">
                        From {formatCurrency(Number(spotlightFrom.price))} + {SERVICE_FEE_PERCENT}% fee
                      </p>
                    ) : (
                      <p className="text-xs text-muted">{spotlightEvent.category?.name}</p>
                    )}
                  </div>
                  {spotlightBookable && (
                    <Link
                      href={`/cart?event=${encodeURIComponent(spotlightEvent.slug)}`}
                      className="ml-1 shrink-0"
                      aria-label={`Book tickets for ${spotlightEvent.title}`}
                    >
                      <Button variant="primary" size="sm">
                        Book Now
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] w-full flex-col justify-end rounded-panel border border-white/10 bg-white/[0.045] p-7 shadow-elevated">
                <span className="flex h-12 w-12 items-center justify-center rounded-btn bg-brand-500/20 text-brand-300">
                  <Ticket className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-6 text-2xl font-extrabold tracking-[-0.025em]">One place for every kind of plan.</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">Music, sport, theatre, festivals, conferences and community events from across Kenya.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/70">
                  {['Concerts', 'Festivals', 'Business', 'Theatre', 'Sports'].map((label) => <span key={label} className="rounded-full border border-white/12 px-3 py-1.5">{label}</span>)}
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      <TrustSection eventsTotal={eventsData?.total} citiesCount={cities} />

      {/* ---------------------------------------------------------------- */}
      {/* Category discovery                                                */}
      {/* ---------------------------------------------------------------- */}
      {categories && categories.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-brand-700">Explore</p>
                <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em] text-navy-900 sm:text-[34px]">
                  Browse by category
                </h2>
              </div>
              <Link
                href="/events"
                className="hidden items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
              >
                All events
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="snap-row mt-7 gap-3 sm:hidden">
              {categories.map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  eventCount={events.filter((e) => e.category?.id === c.id).length}
                />
              ))}
            </div>
            <div className="mt-7 hidden grid-cols-3 gap-3.5 sm:grid lg:grid-cols-6">
              {categories.map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  eventCount={events.filter((e) => e.category?.id === c.id).length}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {cityCounts.length > 0 && (
        <section className="border-y border-line bg-white py-11 sm:py-14" aria-labelledby="locations-heading">
          <Container>
            <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="page-kicker">Around Kenya</p>
                <h2 id="locations-heading" className="mt-2 text-[26px] font-extrabold tracking-[-0.025em] text-navy-900 sm:text-[31px]">
                  Browse by location
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Jump straight to events happening in cities represented in our current listings.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 lg:justify-end">
                {cityCounts.map(([city, count]) => (
                  <Link
                    key={city}
                    href={`/events?city=${encodeURIComponent(city)}`}
                    className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-line bg-cream px-4 text-sm font-bold text-navy-800 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    {city}
                    <span className="tnum rounded-full bg-white px-2 py-0.5 text-[11px] text-muted shadow-soft">
                      {count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      <FeaturedEvents />
      <ProcessTimeline />
      <OrganizerCTA />

      {/* Closing CTA */}
      <section className="py-14 sm:py-20">
        <Container>
          <div className="ember-ground flex flex-col items-center gap-5 rounded-panel px-6 py-14 text-center text-white sm:px-12">
            <h2 className="max-w-2xl text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-4xl">
              There&apos;s more happening. <span className="ember-text">Find your place in it.</span>
            </h2>
            <p className="max-w-md text-[15px] text-white/65">
              Explore every live listing, compare ticket tiers, and book securely with M-Pesa.
            </p>
            <Link href="/events">
              <Button variant="primary" size="lg" className="mt-1">
                Explore events
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
