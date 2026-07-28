'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, PlusCircle, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/ui/Card';
import { buttonVariants } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { EventItem, OrganizerDashboardStats } from '@/types';
import { formatCurrency } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

function OrganizerDashboardContent() {
  const { data: stats } = useQuery({
    queryKey: ['organizer-stats'],
    queryFn: async () => {
      const { data } = await api.get('/organizers/me/dashboard');
      return data as OrganizerDashboardStats;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['organizer-events'],
    queryFn: async () => {
      const { data } = await api.get('/events/organizer/mine');
      return data as EventItem[];
    },
  });

  const cards = [
    { label: 'Total Events', value: stats?.totalEvents ?? '-' },
    { label: 'Published', value: stats?.publishedEvents ?? '-' },
    { label: 'Pending Approval', value: stats?.pendingEvents ?? '-' },
    { label: 'Tickets Sold', value: stats?.ticketsSold ?? '-' },
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : '-' },
    { label: 'Your Earnings', value: stats ? formatCurrency(stats.totalOrganizerEarning) : '-' },
  ];

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-navy-900">Organizer Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-900">Your Events</h2>
        <Link href="/organizer/events/create" className={buttonVariants({ size: 'sm' })}>
          + Create Event
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!events || events.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    className="rounded-none border-0"
                    title="No events yet"
                    description="You haven't created any events yet."
                  />
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const sold = event.ticketTypes.reduce((s, tt) => s + tt.quantitySold, 0);
                const total = event.ticketTypes.reduce((s, tt) => s + tt.quantity, 0);
                return (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium text-navy-900">{event.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {sold}/{total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/organizer/events/${event.id}`} className="font-semibold text-brand-600 hover:text-brand-700">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default function OrganizerDashboardPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <OrganizerDashboardContent />
    </RequireRole>
  );
}
