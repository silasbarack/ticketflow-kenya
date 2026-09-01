'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, QrCode, Ticket as TicketIcon } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import Skeleton from '@/components/ui/Skeleton';
import { Ticket } from '@/types';
import { formatDateTime } from '@/lib/format';
import { tierLabel } from '@/lib/tiers';

function MyTicketsContent() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/my');
      return data as Ticket[];
    },
  });

  return (
    <main className="pb-16">
      <section className="ember-ground text-white">
        <Container className="py-8 sm:py-11">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to dashboard
          </Link>
          <h1 className="mt-3 font-display text-[26px] font-extrabold tracking-[-0.02em] sm:text-[34px]">My tickets</h1>
          <p className="mt-2 text-[15px] text-white/60">Tap a ticket to open its QR code for entry.</p>
        </Container>
      </section>

      <Container className="py-8 sm:py-10">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-card" />
            ))}
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <EmptyState
            icon={<TicketIcon className="h-6 w-6" aria-hidden="true" />}
            title="No tickets yet"
            description="Book an event and your QR tickets will appear here the moment payment clears."
            action={
              <Link href="/events">
                <Button variant="primary">Browse events</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="group overflow-hidden rounded-card border border-line bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
              >
                {/* Stub header — the tier, the way it reads on the ticket itself */}
                <div className="flex items-center justify-between gap-2 bg-ink-900 px-4 py-3">
                  <span className="eyebrow truncate text-brand-300">
                    {ticket.ticketType.name} · {tierLabel(ticket.ticketType.category)}
                  </span>
                  <QrCode
                    className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white"
                    aria-hidden="true"
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 font-display text-[15px] font-bold leading-snug text-navy-900">
                      {ticket.order.event.title}
                    </h2>
                    <StatusBadge status={ticket.status} />
                  </div>

                  <p className="mt-2 text-[13px] text-muted">{formatDateTime(ticket.order.event.startDateTime)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {ticket.order.event.venue}, {ticket.order.event.city}
                    </span>
                  </p>

                  {/* Perforation, then the code — the way a real stub tears */}
                  <div className="mt-4 border-t border-dashed border-line pt-3">
                    <p className="tnum font-mono text-xs text-navy-400">{ticket.ticketCode}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}

export default function MyTicketsPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <MyTicketsContent />
    </RequireRole>
  );
}
