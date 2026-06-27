'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { EventItem, OrganizerDashboardStats } from '@/types';
import { formatCurrency } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: '\u{1F4CA}' },
  { label: 'Create Event', href: '/organizer/events/create', icon: '➕' },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: '\u{1F4F1}' },
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
      <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Events</h2>
        <Link
          href="/organizer/events/create"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Create Event
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!events || events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  You haven&apos;t created any events yet.
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const sold = event.ticketTypes.reduce((s, tt) => s + tt.quantitySold, 0);
                const total = event.ticketTypes.reduce((s, tt) => s + tt.quantity, 0);
                return (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
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
