'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import { Ticket } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';

function ETicketContent() {
  const params = useParams<{ id: string }>();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${params.id}`);
      return data as Ticket;
    },
  });

  if (isLoading) return <main className="mx-auto max-w-lg px-4 py-16 text-gray-500">Loading ticket...</main>;
  if (!ticket) return <main className="mx-auto max-w-lg px-4 py-16 text-gray-500">Ticket not found.</main>;

  return (
    <main className="mx-auto max-w-lg px-4 py-10 print:py-0">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-brand-600 px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-wide text-brand-100">TicketFlow Kenya E-Ticket</p>
          <h1 className="mt-1 text-xl font-bold">{ticket.order.event.title}</h1>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <div className="rounded-xl border border-gray-200 p-3">
            <Image src={ticket.qrCodeData} alt="Ticket QR code" width={220} height={220} unoptimized />
          </div>
          <p className="font-mono text-sm text-gray-500">{ticket.ticketCode}</p>
          <StatusBadge status={ticket.status} />
        </div>

        <div className="space-y-3 border-t border-gray-100 px-6 py-5 text-sm">
          <Row label="Ticket type" value={`${ticket.ticketType.name} (${formatTicketCategory(ticket.ticketType.category)})`} />
          <Row label="Price" value={formatCurrency(ticket.ticketType.price)} />
          <Row label="Venue" value={`${ticket.order.event.venue}, ${ticket.order.event.city}`} />
          <Row label="Date" value={formatDateTime(ticket.order.event.startDateTime)} />
          {ticket.checkIn && <Row label="Checked in" value={formatDateTime(ticket.checkIn.checkedInAt)} />}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-400">
          Present this QR code at the gate. Each ticket can only be scanned once.
        </div>
      </div>

      <div className="mt-4 flex gap-3 print:hidden">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticket.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-brand-700"
        >
          ⬇ Download PDF Ticket
        </a>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Print
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function ETicketPage() {
  return (
    <RequireRole roles={['CUSTOMER', 'ORGANIZER', 'ADMIN']}>
      <ETicketContent />
    </RequireRole>
  );
}
