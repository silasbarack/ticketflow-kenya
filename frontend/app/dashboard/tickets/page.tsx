'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
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
      <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
      <p className="mt-1 text-gray-500">Tap a ticket to view its QR code for entry.</p>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Loading tickets...</p>
      ) : !tickets || tickets.length === 0 ? (
        <p className="mt-6 text-gray-500">You don&apos;t have any tickets yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-brand-600">{ticket.ticketType.name}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{ticket.order.event.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{formatDateTime(ticket.order.event.startDateTime)}</p>
              <p className="mt-3 text-xs font-mono text-gray-400">{ticket.ticketCode}</p>
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
