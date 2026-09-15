'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, MapPin, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import Container from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import EventGrid from '@/components/EventGrid';
import HeroSearch from '@/components/HeroSearch';
import OrganizerCTA from '@/components/OrganizerCTA';
import { EventCategory, EventItem } from '@/types';

export default function LandingPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => (await api.get('/events', { params: { take: 50 } })).data as { events: EventItem[]; total: number },
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data as EventCategory[],
  });
  const events = data?.events ?? [];
  const featured = events.filter((event) => event.isFeatured);
  const upcoming = [...events].sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  const cities = Array.from(new Set(events.map((event) => event.city))).filter(Boolean).sort();
  return (
    <main className="marketplace-home bg-white">
      <section className="marketplace-intro">
        <Container className="grid items-center gap-8 py-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="min-w-0">
            <p className="page-kicker">Good plans start here</p>
            <h1 className="mt-4 text-[36px] font-extrabold leading-[1.08] tracking-[-0.045em] text-navy-900 sm:text-[50px] lg:text-[56px]">Go out.<br /><span className="text-brand-600">Make a memory.</span></h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">Live music, big ideas, match days and everything in between. Find your next experience in Kenya.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="#discover-events" className={buttonVariants()}>Find your event <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <span className="flex items-center gap-2 text-xs font-medium text-muted"><Smartphone className="h-4 w-4" aria-hidden="true" />Book with M-Pesa</span>
            </div>
          </div>
          <div className="relative hidden sm:block">
            <div className="relative h-[260px] overflow-hidden rounded-panel lg:h-[300px]">
              <Image src="/hero-party.jpg" alt="An audience enjoying a live music performance" fill priority sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden="true" />
              <p className="absolute bottom-5 left-5 right-5 text-2xl font-bold leading-tight tracking-tight text-white">Less scrolling.<br />More being there.</p>
            </div>
            <span className="absolute -right-3 -top-3 flex h-20 w-20 rotate-6 items-center justify-center rounded-full border-[5px] border-white bg-brand-600 text-center text-xs font-bold uppercase leading-snug tracking-wide text-white">Made for<br />going out</span>
          </div>
        </Container>
      </section>
      <Container className="relative pb-7 pt-2">
        <HeroSearch />
        {categories && categories.length > 0 && <nav aria-label="Event categories" className="snap-row mt-6 gap-2 pb-1">
          <Link href="/events" data-active="true" className="filter-chip shrink-0">All experiences</Link>
          {categories.map((category) => <Link key={category.id} href={`/events?category=${encodeURIComponent(category.id)}`} className="filter-chip shrink-0">{category.name}</Link>)}
        </nav>}
      </Container>
      <section id="discover-events" className="scroll-mt-24 border-t border-line py-9 sm:py-12"><Container>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="page-kicker">Your next plan</p><h2 className="marketplace-heading mt-2">{featured.length ? 'In the spotlight' : 'Coming up in Kenya'}</h2></div>
          <Link href="/events" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-brand-700">View all <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <EventGrid events={(featured.length ? featured : upcoming).slice(0, 6)} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyTitle="New experiences are on their way" emptyDescription="Check back soon for upcoming events across Kenya." />
      </Container></section>
      {featured.length > 0 && upcoming.some((event) => !event.isFeatured) && <section className="border-t border-line py-9 sm:py-12"><Container><div className="mb-6"><p className="page-kicker">Save the date</p><h2 className="marketplace-heading mt-2">More to look forward to</h2></div><EventGrid events={upcoming.filter((event) => !event.isFeatured).slice(0, 3)} /></Container></section>}
      {cities.length > 0 && <section className="border-y border-line bg-white py-8"><Container className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="page-kicker">Around the country</p><h2 className="mt-2 text-xl font-bold tracking-tight text-navy-900">Find your city. Find your scene.</h2></div>
        <div className="flex flex-wrap gap-2">{cities.map((city) => <Link key={city} href={`/events?city=${encodeURIComponent(city)}`} className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-4 text-sm font-semibold text-navy-700 hover:border-brand-600 hover:text-brand-700"><MapPin className="h-4 w-4" aria-hidden="true" />{city}</Link>)}</div>
      </Container></section>}
      <section id="how-it-works" className="scroll-mt-24 py-10 sm:py-14"><Container>
        <div className="mb-8"><p className="page-kicker">From discovery to the door</p><h2 className="marketplace-heading mt-2">Your next experience, made easy.</h2></div>
        <div className="grid gap-7 sm:grid-cols-3">{[
          { icon: ShieldCheck, title: 'Find something you love', text: 'Explore events, compare ticket options and choose your experience.' },
          { icon: Smartphone, title: 'Pay with M-Pesa', text: 'Confirm the prompt on your phone. Your PIN stays with M-Pesa.' },
          { icon: QrCode, title: 'Show up. Scan in.', text: 'After payment, open your QR ticket from your account at the entrance.' },
        ].map((step, index) => <div key={step.title} className="border-t-2 border-brand-600 pt-5"><div className="flex items-center justify-between"><step.icon className="h-6 w-6 text-brand-600" aria-hidden="true" /><span className="text-sm font-bold text-muted">0{index + 1}</span></div><h3 className="mt-4 text-lg font-bold text-navy-900">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p></div>)}</div>
      </Container></section>
      <OrganizerCTA />
    </main>
  );
}
