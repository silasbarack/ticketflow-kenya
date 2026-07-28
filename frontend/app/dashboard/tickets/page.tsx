'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { Ticket } from '@/types';
import { formatDateTime } from '@/lib/format';

function MyTicketsContent() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/my');
      return data as Ticket[];
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-navy-900">My Tickets</h1>
      <p className="mt-1 text-muted">Tap a ticket to view its QR code for entry.</p>

      {isLoading ? (
        <p className="mt-6 text-muted">Loading tickets...</p>
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState className="mt-6" title="No tickets yet" description="You don't have any tickets yet." />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card className="p-5 transition hover:border-brand-300 hover:shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-brand-600">{ticket.ticketType.name}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <h3 className="mt-2 font-semibold text-navy-900">{ticket.order.event.title}</h3>
                <p className="mt-1 text-sm text-muted">{formatDateTime(ticket.order.event.startDateTime)}</p>
                <p className="mt-3 text-xs font-mono text-navy-400">{ticket.ticketCode}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
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
