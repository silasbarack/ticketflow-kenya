'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, LayoutDashboard, Plus, PlusCircle, ReceiptText, ScanLine, Ticket, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import MetricCard from '@/components/ui/MetricCard';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { buttonVariants } from '@/components/ui/Button';
import { EventItem, OrganizerDashboardStats } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

function OrganizerDashboardContent() {
  const statsQuery = useQuery({
    queryKey: ['organizer-stats'],
    queryFn: async () => {
      const { data } = await api.get('/organizers/me/dashboard');
      return data as OrganizerDashboardStats;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ['organizer-events'],
    queryFn: async () => {
      const { data } = await api.get('/events/organizer/mine');
      return data as EventItem[];
    },
  });

  const stats = statsQuery.data;
  const events = eventsQuery.data ?? [];
  const metrics = [
    { label: 'Tickets sold', value: stats?.ticketsSold ?? 0, icon: Ticket, tone: 'brand' as const },
    { label: 'Your earnings', value: stats ? formatCurrency(stats.totalOrganizerEarning) : 'KES 0', icon: Wallet, tone: 'success' as const },
    { label: 'Paid orders', value: stats?.totalOrders ?? 0, icon: ReceiptText, tone: 'neutral' as const },
    { label: 'Published events', value: stats?.publishedEvents ?? 0, icon: CalendarDays, tone: 'success' as const },
    { label: 'Awaiting approval', value: stats?.pendingEvents ?? 0, icon: Clock3, tone: 'warning' as const },
    { label: 'Gross ticket revenue', value: stats ? formatCurrency(stats.totalRevenue) : 'KES 0', icon: Wallet, tone: 'neutral' as const },
  ];

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Organizer workspace"
        title="Your event business"
        description="Track real ticket activity, manage your events and keep entry moving."
        actions={<Link href="/organizer/events/create" className={buttonVariants({ size: 'sm' })}><Plus className="h-4 w-4" aria-hidden="true" />Create event</Link>}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Organizer metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} loading={statsQuery.isLoading} />)}
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div><p className="page-kicker">Portfolio</p><h2 className="section-title mt-2">Your events</h2></div>
          <span className="tnum text-xs text-muted">{events.length} total</span>
        </div>

        <div className="mt-4">
          {eventsQuery.isLoading ? (
            <Skeleton className="h-72 rounded-card" />
          ) : eventsQuery.isError ? (
            <EmptyState title="Events could not be loaded" description="Try refreshing this page in a moment." />
          ) : events.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />} title="Create your first event" description="Add the essentials first, then build ticket tiers before submitting for approval." action={<Link href="/organizer/events/create" className={buttonVariants()}>Create event</Link>} />
          ) : (
            <>
              <ul className="space-y-3 md:hidden">
                {events.map((event) => {
                  const sold = event.ticketTypes.reduce((sum, tier) => sum + tier.quantitySold, 0);
                  const total = event.ticketTypes.reduce((sum, tier) => sum + tier.quantity, 0);
                  return (
                    <li key={event.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-bold text-navy-900">{event.title}</p><StatusBadge status={event.status} /></div>
                      <p className="mt-2 text-xs text-muted">{formatDate(event.startDateTime)} · {event.city}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-line pt-3"><p className="tnum text-xs font-semibold text-navy-700">{sold}/{total} tickets</p><Link href={`/organizer/events/${event.id}`} className="text-sm font-bold text-brand-700">Manage</Link></div>
                    </li>
                  );
                })}
              </ul>

              <div className="table-shell hidden overflow-x-auto md:block">
                <table className="data-table min-w-[720px]">
                  <thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Tickets</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {events.map((event) => {
                      const sold = event.ticketTypes.reduce((sum, tier) => sum + tier.quantitySold, 0);
                      const total = event.ticketTypes.reduce((sum, tier) => sum + tier.quantity, 0);
                      return (
                        <tr key={event.id}>
                          <td className="font-bold text-navy-900">{event.title}</td>
                          <td className="whitespace-nowrap text-muted">{formatDate(event.startDateTime)}</td>
                          <td><StatusBadge status={event.status} /></td>
                          <td className="tnum text-muted">{sold}/{total}</td>
                          <td className="text-right"><Link href={`/organizer/events/${event.id}`} className="font-bold text-brand-700 hover:underline">Manage</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function OrganizerDashboardPage() {
  return <RequireRole roles={['ORGANIZER']}><OrganizerDashboardContent /></RequireRole>;
}
