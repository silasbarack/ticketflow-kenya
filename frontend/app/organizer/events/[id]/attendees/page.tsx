'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, LayoutDashboard, PlusCircle, ScanLine, Search, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Attendee } from '@/types';
import { formatDateTime, formatTicketCategory } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

function toCsv(attendees: Attendee[]) {
  const header = ['Ticket Code', 'Name', 'Email', 'Phone', 'Ticket Type', 'Status', 'Checked In At', 'Purchased At'];
  const rows = attendees.map((attendee) => [attendee.ticketCode, attendee.attendeeName, attendee.email, attendee.phone || '', attendee.ticketType, attendee.status, attendee.checkedInAt || '', attendee.purchasedAt]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function AttendeesContent() {
  const params = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const { data: attendees, isLoading, isError } = useQuery({
    queryKey: ['attendees', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${params.id}/attendees`);
      return data as Attendee[];
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return attendees ?? [];
    return (attendees ?? []).filter((attendee) => `${attendee.ticketCode} ${attendee.attendeeName} ${attendee.email} ${attendee.ticketType}`.toLowerCase().includes(needle));
  }, [attendees, search]);

  function downloadCsv() {
    if (!attendees?.length) return;
    const url = URL.createObjectURL(new Blob([toCsv(attendees)], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendees-${params.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Guest list"
        title="Attendees"
        description="Search issued tickets, see entry status and export the complete attendee report."
        actions={<Button variant="outline" size="sm" onClick={downloadCsv} disabled={!attendees?.length}><Download className="h-4 w-4" aria-hidden="true" />Export CSV</Button>}
      />

      <label className="relative mt-6 block max-w-md">
        <span className="sr-only">Search attendees</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or ticket code" className="pl-11" />
      </label>

      <div className="mt-6">
        {isLoading ? <Skeleton className="h-72 rounded-card" /> : isError ? <EmptyState title="Attendees could not be loaded" description="Try refreshing this page in a moment." /> : filtered.length === 0 ? <EmptyState icon={<UserCheck className="h-6 w-6" aria-hidden="true" />} title={attendees?.length ? 'No matching attendees' : 'No tickets sold yet'} description={attendees?.length ? 'Try a different search term.' : 'Issued tickets will appear here after successful payments.'} /> : (
          <>
            <ul className="space-y-3 md:hidden">
              {filtered.map((attendee) => (
                <li key={attendee.ticketCode} className="rounded-card border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-navy-900">{attendee.attendeeName}</p><p className="truncate text-xs text-muted">{attendee.email}</p></div><StatusBadge status={attendee.status} /></div>
                  <div className="mt-4 border-t border-line pt-3"><p className="font-mono text-xs text-navy-600">{attendee.ticketCode}</p><p className="mt-1 text-xs text-muted">{attendee.ticketType} · {formatTicketCategory(attendee.category)}</p><p className="mt-2 text-xs text-muted">{attendee.checkedInAt ? `Checked in ${formatDateTime(attendee.checkedInAt)}` : 'Not checked in'}</p></div>
                </li>
              ))}
            </ul>
            <div className="table-shell hidden overflow-x-auto md:block">
              <table className="data-table min-w-[820px]">
                <thead><tr><th>Ticket code</th><th>Attendee</th><th>Ticket type</th><th>Status</th><th>Checked in</th></tr></thead>
                <tbody>{filtered.map((attendee) => <tr key={attendee.ticketCode}><td className="font-mono text-xs text-navy-600">{attendee.ticketCode}</td><td><p className="font-bold text-navy-900">{attendee.attendeeName}</p><p className="text-xs text-muted">{attendee.email}</p></td><td className="text-navy-700">{attendee.ticketType} ({formatTicketCategory(attendee.category)})</td><td><StatusBadge status={attendee.status} /></td><td className="whitespace-nowrap text-muted">{attendee.checkedInAt ? formatDateTime(attendee.checkedInAt) : 'Not yet'}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AttendeesPage() {
  return <RequireRole roles={['ORGANIZER']}><AttendeesContent /></RequireRole>;
}
