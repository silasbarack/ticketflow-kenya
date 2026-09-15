'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, CreditCard, LayoutDashboard, ReceiptText, ScanLine, Ticket, Users } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/ui/MetricCard';
import PageHeader from '@/components/ui/PageHeader';
import ErrorState from '@/components/ui/ErrorState';
import { buttonVariants } from '@/components/ui/Button';
import { AdminStats } from '@/types';
import { formatCurrency } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

function AdminDashboardContent() {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data as AdminStats;
    },
  });

  if (isError) {
    return (
      <DashboardLayout items={NAV}>
        <ErrorState title="We couldn't load the platform overview" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  const metrics = [
    { label: 'Pending approvals', value: stats?.pendingEvents ?? 0, icon: CalendarCheck, tone: 'warning' as const, hint: 'Events waiting for review' },
    { label: 'Gross ticket revenue', value: stats ? formatCurrency(stats.totalRevenue) : 'KES 0', icon: CreditCard, tone: 'brand' as const },
    { label: 'Tickets sold', value: stats?.ticketsSold ?? 0, icon: Ticket, tone: 'neutral' as const },
    { label: 'Tickets checked in', value: stats?.ticketsCheckedIn ?? 0, icon: ScanLine, tone: 'success' as const },
    { label: 'Active community', value: stats?.totalUsers ?? 0, icon: Users, tone: 'neutral' as const, hint: `${stats?.totalCustomers ?? 0} customers · ${stats?.totalOrganizers ?? 0} organizers` },
    { label: 'Published events', value: stats?.publishedEvents ?? 0, icon: CheckCircle2, tone: 'success' as const, hint: `${stats?.totalEvents ?? 0} events in total` },
  ];

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Platform control"
        title="Administration overview"
        description="Live platform totals, moderation workload and payment activity from TicketFlow data."
        actions={
          <Link href="/admin/events" className={buttonVariants({ size: 'sm' })}>
            Review events
          </Link>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Platform metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} loading={isLoading} />)}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.65fr]">
        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="page-kicker">Operations</p>
              <h2 className="section-title mt-2">Moderation and payment tools</h2>
            </div>
            <ReceiptText className="h-5 w-5 text-brand-600" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { href: '/admin/events', label: 'Event approvals', detail: `${stats?.pendingEvents ?? 0} awaiting review` },
              { href: '/admin/payments', label: 'Payment ledger', detail: `${stats?.totalOrders ?? 0} paid orders` },
              { href: '/admin/users', label: 'User access', detail: `${stats?.totalUsers ?? 0} accounts` },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-btn border border-line bg-cream/55 p-4 transition hover:border-brand-200 hover:bg-brand-50/60">
                <p className="text-sm font-bold text-navy-900">{item.label}</p>
                <p className="mt-1 text-xs text-muted">{item.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-card bg-ink-950 p-5 text-white shadow-card sm:p-6">
          <p className="page-kicker text-brand-300">Platform earnings</p>
          <p className="tnum mt-3 text-3xl font-extrabold tracking-[-0.04em]">
            {stats ? formatCurrency(stats.totalCommission) : 'KES 0'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">Commission recorded from completed payments.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function AdminDashboardPage() {
  return <RequireRole roles={['ADMIN']}><AdminDashboardContent /></RequireRole>;
}
