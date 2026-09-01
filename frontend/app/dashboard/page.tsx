'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Compass, QrCode, Receipt, Ticket as TicketIcon, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import { useAuth } from '@/hooks/useAuth';
import { Order, Ticket } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

function CustomerDashboardContent() {
  const { user } = useAuth();

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders/my');
      return data as Order[];
    },
  });

  const { data: tickets } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/my');
      return data as Ticket[];
    },
  });

  const allOrders = orders ?? [];
  const paidOrders = allOrders.filter((o) => o.status === 'PAID');
  const activeTickets = (tickets ?? []).filter((t) => t.status === 'ACTIVE');
  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  // The next event this account actually holds a live ticket for.
  const nextEvent = activeTickets
    .map((t) => t.order?.event)
    .filter((e): e is NonNullable<typeof e> => Boolean(e?.startDateTime))
    .filter((e) => new Date(e.startDateTime).getTime() > Date.now())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())[0];

  const stats = [
    { icon: TicketIcon, label: 'Active tickets', value: String(activeTickets.length) },
    { icon: Receipt, label: 'Orders placed', value: String(allOrders.length) },
    { icon: Wallet, label: 'Total spent', value: formatCurrency(totalSpent) },
  ];

  return (
    <main className="pb-16">
      {/* Greeting + at-a-glance numbers */}
      <section className="ember-ground text-white">
        <Container className="py-9 sm:py-12">
          <p className="eyebrow text-brand-300">Your account</p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
            Welcome, {user?.firstName}
          </h1>
          <p className="mt-2 text-[15px] text-white/60">Your tickets, orders and upcoming events in one place.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="panel-glass flex items-center gap-3.5 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-brand-500/20 text-brand-300">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="tnum truncate text-xl font-extrabold">{stat.value}</p>
                  <p className="text-[12px] text-white/50">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-8 sm:py-10">
        {/* Next event up */}
        {nextEvent && (
          <div className="flex flex-col gap-4 rounded-card border border-brand-200 bg-brand-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-white text-brand-700 shadow-soft">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-brand-700">Coming up next</p>
                <p className="mt-1.5 text-base font-bold text-navy-900">{nextEvent.title}</p>
                <p className="text-[13px] text-muted">
                  {formatDateTime(nextEvent.startDateTime)} · {nextEvent.venue}, {nextEvent.city}
                </p>
              </div>
            </div>
            <Link href="/dashboard/tickets" className="shrink-0">
              <Button variant="primary" size="sm">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Show my ticket
              </Button>
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div className={`grid gap-4 sm:grid-cols-2 ${nextEvent ? 'mt-6' : ''}`}>
          <ActionCard
            href="/dashboard/tickets"
            icon={<TicketIcon className="h-5 w-5" aria-hidden="true" />}
            title="My tickets"
            description="View and download your e-tickets with QR codes."
          />
          <ActionCard
            href="/events"
            icon={<Compass className="h-5 w-5" aria-hidden="true" />}
            title="Browse events"
            description="Find your next night out and book it in a few taps."
          />
        </div>

        {/* Recent orders */}
        <div className="mt-10 flex items-end justify-between gap-4">
          <h2 className="text-lg font-bold text-navy-900">Recent orders</h2>
          {allOrders.length > 0 && (
            <span className="tnum text-xs text-muted">
              {allOrders.length} order{allOrders.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {allOrders.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
            title="No orders yet"
            description="When you book an event, the order and its tickets show up here."
            action={
              <Link href="/events">
                <Button variant="primary">Browse events</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Mobile: one card per order — a 5-column table cannot survive 360px. */}
            <ul className="mt-4 space-y-3 sm:hidden">
              {allOrders.map((order) => (
                <li key={order.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold text-navy-900">{order.event.title}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="tnum mt-1 text-xs text-muted">
                    {order.orderNumber} · {formatDate(order.createdAt)}
                  </p>
                  <p className="tnum mt-2.5 text-lg font-bold text-navy-900">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 hidden overflow-hidden rounded-card border border-line bg-white shadow-soft sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-cream/60 text-left text-[11px] uppercase tracking-eyebrow text-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold">Order</th>
                    <th className="px-5 py-3 font-bold">Event</th>
                    <th className="px-5 py-3 font-bold">Total</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {allOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-cream/50">
                      <td className="tnum px-5 py-3.5 font-medium text-navy-900">{order.orderNumber}</td>
                      <td className="px-5 py-3.5 text-navy-600">{order.event.title}</td>
                      <td className="tnum px-5 py-3.5 font-semibold text-navy-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3.5 text-muted">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Container>
    </main>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-card border border-line bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-base font-bold text-navy-900">
          {title}
          <ArrowRight
            className="h-4 w-4 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted">{description}</span>
      </span>
    </Link>
  );
}

export default function CustomerDashboardPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <CustomerDashboardContent />
    </RequireRole>
  );
}
