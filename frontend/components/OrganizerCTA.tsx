import Link from 'next/link';
import { BarChart3, Check, QrCode, TicketPlus, TrendingUp, Users } from 'lucide-react';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

const BENEFITS = [
  'Create Regular, VIP, VVIP, Student & Early Bird ticket tiers',
  'Track sales and revenue in real time',
  'Accept M-Pesa payments with instant settlement tracking',
  'Scan QR tickets at the gate — online or offline',
  'Export attendee reports as CSV',
];

export default function OrganizerCTA() {
  return (
    <section id="for-organizers" className="scroll-mt-20 bg-navy-900 py-16 text-white sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Illustration mockup */}
          <div className="relative order-2 lg:order-1">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-elevated sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/70">Sales overview</p>
                <span className="flex items-center gap-1 rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Live
                </span>
              </div>

              <div className="mt-6 flex h-32 items-end gap-2.5" aria-hidden="true">
                {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%` }} />
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.06] p-3.5">
                  <p className="flex items-center gap-1.5 text-xs text-white/60">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Tickets sold
                  </p>
                  <p className="mt-1 text-xl font-bold">1,284</p>
                </div>
                <div className="rounded-xl bg-white/[0.06] p-3.5">
                  <p className="flex items-center gap-1.5 text-xs text-white/60">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" /> Checked in
                  </p>
                  <p className="mt-1 text-xl font-bold">842</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Scanner ready</p>
                  <p className="text-xs text-white/60">Verify tickets at the gate in real time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-400">
              <TicketPlus className="h-4 w-4" aria-hidden="true" />
              For Organizers
            </p>
            <h2 className="mt-2 text-[28px] font-bold leading-tight sm:text-4xl">
              Everything you need to run a successful event.
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Publish your event, sell tickets across every tier, and manage the door — all from one
              dashboard built for Kenyan organizers.
            </p>

            <ul className="mt-7 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Start Selling Tickets
                </Button>
              </Link>
              <p className="text-sm text-white/60">
                You keep 100% of your ticket price — buyers pay a transparent 9% service fee at checkout.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
