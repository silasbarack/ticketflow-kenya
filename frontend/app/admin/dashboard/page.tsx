'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarCheck, CheckCircle2, CreditCard, ReceiptText, ScanLine, ShieldCheck, Ticket, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/ui/MetricCard';
import PageHeader from '@/components/ui/PageHeader';
import ErrorState from '@/components/ui/ErrorState';
import { buttonVariants } from '@/components/ui/Button';
import { AdminStats } from '@/types';
import { formatCurrency } from '@/lib/format';
import { ADMIN_NAV as NAV } from '@/lib/admin-nav';


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

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.62fr]">
        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="page-kicker">Operations</p>
              <h2 className="section-title mt-2">Moderation and payment tools</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { href: '/admin/events', label: 'Event approvals', detail: `${stats?.pendingEvents ?? 0} awaiting review`, icon: CheckCircle2 },
              { href: '/admin/organizers', label: 'Organizer verification', detail: 'Review company KYB applications', icon: ShieldCheck },
              { href: '/admin/payments', label: 'Payment ledger', detail: `${stats?.totalOrders ?? 0} paid orders`, icon: CreditCard },
              { href: '/admin/users', label: 'User access', detail: `${stats?.totalUsers ?? 0} accounts`, icon: Users },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group flex items-center gap-3.5 rounded-xl border border-line bg-cream/60 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-soft">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-navy-700 shadow-soft ring-1 ring-inset ring-navy-900/[0.06] transition group-hover:text-brand-600">
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-navy-900">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{item.detail}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:text-brand-600" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="relative isolate overflow-hidden rounded-card bg-ink-950 p-5 text-white shadow-elevated sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-brand-600/35 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-52 w-52 rounded-full bg-white/[0.05] blur-2xl" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <p className="page-kicker text-brand-300">Platform earnings</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-300 ring-1 ring-inset ring-white/10">
              <TrendingUp className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          </div>
          <p className="tnum mt-6 text-[34px] font-extrabold leading-none tracking-[-0.045em]">
            {stats ? formatCurrency(stats.totalCommission) : 'KES 0'}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">Commission recorded from completed payments.</p>
          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/45">
            Buyer-paid service fee, settled on every successful M-Pesa payment.
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function AdminDashboardPage() {
  return <RequireRole roles={['ADMIN']}><AdminDashboardContent /></RequireRole>;
}
