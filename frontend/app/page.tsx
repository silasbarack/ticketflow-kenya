'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, MapPin, ShieldCheck, Smartphone, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import CategoryCard from '@/components/CategoryCard';
import FeaturedEvents from '@/components/FeaturedEvents';
import ProcessTimeline from '@/components/ProcessTimeline';
import OrganizerCTA from '@/components/OrganizerCTA';
import TrustSection from '@/components/TrustSection';
import HeroSearch from '@/components/HeroSearch';
import { EventCategory, EventItem } from '@/types';

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
  const spotlightEvent = events.find((e) => e.posterUrl) ?? events[0];

  return (
    <main>
      {/* ---------------------------------------------------------------- */}
      {/* Hero — night-event photo background                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-party.jpg"
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
          />
          {/* Navy overlay keeps text readable while letting the crowd/light show through */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/80 to-navy-900/55" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950/90 to-transparent" />
        </div>

        <Container className="relative grid gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-28">
          <div>
            <span
              className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur"
              style={{ animationDelay: '0ms' }}
            >
              🇰🇪 Kenya&apos;s modern ticketing marketplace
            </span>

            <h1
              className="animate-fade-in-up mt-5 text-[34px] font-extrabold leading-[1.1] text-white drop-shadow-[0_2px_8px_rgba(8,15,24,0.6)] sm:text-5xl lg:text-[52px]"
              style={{ animationDelay: '80ms' }}
            >
              Discover events worth showing up for.
            </h1>

            <p
              className="animate-fade-in-up mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Book concerts, festivals, theatre, sports and business events across Kenya —
              from Nairobi&apos;s biggest stages to coastal weekends in Watamu and Mombasa.
            </p>
            <p
              className="animate-fade-in-up mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-[15px]"
              style={{ animationDelay: '220ms' }}
            >
              Choose your tier — Early Bird, Regular, Student, VIP or VVIP — pay securely with an
              M-Pesa STK push, and your signed QR e-ticket lands in your account and inbox
              instantly. No queues, no paper, no fakes at the gate.
            </p>

            <div className="animate-fade-in-up mt-7" style={{ animationDelay: '280ms' }}>
              <HeroSearch />
            </div>

            <div className="animate-fade-in-up mt-6 flex flex-wrap gap-3" style={{ animationDelay: '340ms' }}>
              <Link href="/events">
                <Button variant="primary" size="lg">
                  Explore Events
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 bg-transparent text-white hover:border-white/70 hover:bg-white/10"
                >
                  Create an Event
                </Button>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-brand-300" aria-hidden="true" />
                Secure M-Pesa payments
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-brand-300" aria-hidden="true" />
                Instant QR tickets
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
                Verified event organizers
              </span>
            </div>
          </div>

          {/* Right: featured event spotlight */}
          <div className="relative hidden lg:block">
            {spotlightEvent ? (
              <Link href={`/events/${spotlightEvent.slug}`} className="group relative block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/15 shadow-elevated">
                  {spotlightEvent.posterUrl ? (
                    <Image
                      src={spotlightEvent.posterUrl}
                      alt={spotlightEvent.title}
                      fill
                      unoptimized
                      priority
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950 p-8">
                      <span className="text-center text-xl font-bold text-white/90">{spotlightEvent.title}</span>
                    </div>
                  )}
                  <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-700">
                    Spotlight event
                  </span>
                </div>

                {/* Overlapping date/location chip */}
                <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-elevated">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{formatDate(spotlightEvent.startDateTime)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {spotlightEvent.venue}, {spotlightEvent.city}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-navy-800 to-navy-950 shadow-elevated">
                <Ticket className="h-16 w-16 text-white/30" aria-hidden="true" />
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
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Explore</p>
                <h2 className="mt-1.5 text-[28px] font-bold text-navy-900 sm:text-3xl">Browse by category</h2>
              </div>
            </div>

            <div className="snap-row mt-7 gap-3.5 sm:hidden">
              {categories.map((c) => (
                <CategoryCard key={c.id} category={c} eventCount={events.filter((e) => e.category?.id === c.id).length} />
              ))}
            </div>
            <div className="mt-7 hidden grid-cols-3 gap-4 sm:grid lg:grid-cols-6">
              {categories.map((c) => (
                <CategoryCard key={c.id} category={c} eventCount={events.filter((e) => e.category?.id === c.id).length} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <FeaturedEvents />
      <ProcessTimeline />
      <OrganizerCTA />

      {/* Closing CTA */}
      <section className="py-14 sm:py-20">
        <Container className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-soft sm:px-12">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Ready to find your next night out?</h2>
          <p className="max-w-md text-muted">
            Thousands of Kenyans discover concerts, festivals, and conferences on TicketFlow every week.
          </p>
          <Link href="/events">
            <Button variant="primary" size="lg" className="mt-1">
              Explore Events
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </Container>
      </section>
    </main>
  );
}
