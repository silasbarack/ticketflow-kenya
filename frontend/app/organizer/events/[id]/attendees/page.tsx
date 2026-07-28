'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, PlusCircle, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Attendee } from '@/types';
import { formatDateTime, formatTicketCategory } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

function toCsv(attendees: Attendee[]) {
  const header = ['Ticket Code', 'Name', 'Email', 'Phone', 'Ticket Type', 'Status', 'Checked In At', 'Purchased At'];
  const rows = attendees.map((a) => [
    a.ticketCode,
    a.attendeeName,
    a.email,
    a.phone || '',
    a.ticketType,
    a.status,
    a.checkedInAt || '',
    a.purchasedAt,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

function AttendeesContent() {
  const params = useParams<{ id: string }>();

  const { data: attendees, isLoading } = useQuery({
    queryKey: ['attendees', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${params.id}/attendees`);
      return data as Attendee[];
    },
  });

  function downloadCsv() {
    if (!attendees) return;
    const csv = toCsv(attendees);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${params.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout items={NAV}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Attendees</h1>
        <button
          onClick={downloadCsv}
          disabled={!attendees || attendees.length === 0}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-900/5 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Ticket Code</th>
              <th className="px-4 py-3">Attendee</th>
              <th className="px-4 py-3">Ticket Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Checked In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-navy-400">
                  Loading...
                </td>
              </tr>
            ) : !attendees || attendees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-navy-400">
                  No tickets sold yet.
                </td>
              </tr>
            ) : (
              attendees.map((a) => (
                <tr key={a.ticketCode}>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{a.ticketCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{a.attendeeName}</p>
                    <p className="text-xs text-navy-400">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-600">
                    {a.ticketType} ({formatTicketCategory(a.category)})
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{a.checkedInAt ? formatDateTime(a.checkedInAt) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default function AttendeesPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <AttendeesContent />
    </RequireRole>
  );
}
