'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import FeaturedEvents from '@/components/FeaturedEvents';
import { EventCategory, EventItem } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  'music & concerts': '\u{1F3B6}',
  'tech & business': '\u{1F4BB}',
  sports: '\u{26BD}',
  'arts & theatre': '\u{1F3AD}',
  festivals: '\u{1F389}',
};

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create & publish',
    desc: 'Set up your event, add Regular, VIP, VVIP, Student, or Early Bird ticket types, and submit for approval.',
    icon: '\u{1F4DD}',
  },
  {
    step: '02',
    title: 'Sell with M-Pesa',
    desc: 'Customers check out in seconds with an M-Pesa STK Push — no cash, no manual reconciliation.',
    icon: '\u{1F4F2}',
  },
  {
    step: '03',
    title: 'Scan at the gate',
    desc: 'Every ticket gets a unique QR code. Scan it at entry and duplicate or fake tickets are rejected instantly.',
    icon: '\u{2705}',
  },
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
  const heroPosters = events.filter((e) => e.posterUrl).slice(0, 3);
  const cities = new Set(events.map((e) => e.city)).size;

  const stats = [
    { label: 'Live events', value: eventsData ? `${eventsData.total}+` : '—' },
    { label: 'Cities covered', value: cities || '—' },
    { label: 'Ticket types', value: 'VIP, VVIP & more' },
    { label: 'Platform fee', value: '9% only' },
  ];

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          <Image
            src="/hero-party.jpg"
            alt=""
            fill
            priority
            unoptimized
            className="object-cover brightness-[0.55]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:28px_28px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide">
              {'\u{1F1F0}\u{1F1EA}'} East Africa&apos;s Premier Ticketing Platform
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-5xl">
              Sell tickets. Scan gates.{' '}
              <span className="text-red-100">Get paid via M-Pesa.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:text-lg">
              <strong className="font-semibold text-white">TicketFlow Kenya</strong> is a purpose-built
              event management and ticketing platform for Kenyan organizers and attendees. Whether
              you&apos;re hosting an intimate private gathering, a corporate conference, or a
              large-scale concert, we deliver a complete, professional ticketing experience from
              listing to gate entry.
            </p>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
              Publish your event in minutes, offer tiered ticket categories — Regular, VIP, VVIP,
              Early Bird &amp; Student — accept instant M-Pesa STK Push payments with zero manual
              reconciliation, and manage entry through cryptographically signed, tamper-proof
              QR-code e-tickets. Every ticket is unique, verified, and delivered directly to
              the buyer&apos;s inbox as a PDF.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg shadow-black/10 transition hover:bg-brand-50"
              >
                Browse Events
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Become an Organizer
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2 text-xs text-white/80 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2 sm:text-sm">
              <span className="flex items-center gap-1.5">{'✅'} M-Pesa STK Push</span>
              <span className="flex items-center gap-1.5">{'\u{1F4F1}'} QR e-tickets by email</span>
              <span className="flex items-center gap-1.5">{'\u{1F512}'} Signed QR check-in</span>
              <span className="flex items-center gap-1.5">{'\u{1F4CA}'} Real-time sales dashboard</span>
              <span className="flex items-center gap-1.5">{'\u{1F4BC}'} 9% platform fee only</span>
              <span className="flex items-center gap-1.5">{'\u{1F3AB}'} VIP · VVIP · Student tiers</span>
            </div>
          </div>

          <div className="relative hidden h-80 lg:block">
            {heroPosters.map((event, i) => (
              <div
                key={event.id}
                className="absolute h-56 w-44 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl transition duration-300 hover:z-20 hover:-translate-y-2"
                style={{
                  right: `${i * 90}px`,
                  top: i === 1 ? '40px' : i === 0 ? '0px' : '80px',
                  transform: `rotate(${i === 0 ? -6 : i === 1 ? 3 : -2}deg)`,
                  zIndex: 10 - i,
                }}
              >
                <Image src={event.posterUrl as string} alt={event.title} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by category */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Explore</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">Browse by category</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/events?category=${c.id}`}
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-center transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-md"
              >
                <span className="text-3xl">{CATEGORY_ICONS[c.name.toLowerCase()] || '\u{1F39F}\u{FE0F}'}</span>
                <span className="text-sm font-semibold text-gray-800">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <FeaturedEvents />

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">How it works</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">From setup to sold out</h2>
        </div>
        <div className="relative mt-10 grid gap-8 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gray-200 sm:block" />
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="relative rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl">
                {step.icon}
              </div>
              <p className="mt-4 text-xs font-bold text-brand-500">STEP {step.step}</p>
              <h3 className="mt-1 font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Organizer CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 px-8 py-12 text-center sm:px-16">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-accent-600/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to host your next event?</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-300">
              Join organizers across Kenya selling tickets with M-Pesa, QR check-in, and real-time
              sales tracking — for just 9% commission per ticket.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700"
            >
              Create your free organizer account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
