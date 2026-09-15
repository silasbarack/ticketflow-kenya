'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, LayoutDashboard, ReceiptText, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import FilterTabs from '@/components/ui/FilterTabs';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Payment, PaymentStatus } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

type PaymentFilter = '' | PaymentStatus;
type AdminPayment = Payment & { order: { orderNumber: string; event: { title: string }; user: { firstName: string; lastName: string } } };
const FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

function AdminPaymentsContent() {
  const [status, setStatus] = useState<PaymentFilter>('');
  const [search, setSearch] = useState('');

  const { data: payments, isLoading, isError } = useQuery({
    queryKey: ['admin-payments', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/payments', { params: { status: status || undefined } });
      return data as AdminPayment[];
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return payments ?? [];
    return (payments ?? []).filter((payment) => [payment.order.orderNumber, payment.order.event.title, payment.order.user.firstName, payment.order.user.lastName, payment.provider].join(' ').toLowerCase().includes(needle));
  }, [payments, search]);

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Financial operations" title="Payments" description="Inspect payment attempts and their verified provider status. No customer-reported state is treated as settlement." />

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block max-w-md">
          <span className="sr-only">Search payments</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, event or customer" className="pl-11" />
        </label>
        <FilterTabs value={status} options={FILTERS} onChange={setStatus} label="Filter payments by status" />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-72 rounded-card" />
        ) : isError ? (
          <EmptyState title="Payments could not be loaded" description="Try refreshing this page in a moment." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ReceiptText className="h-6 w-6" aria-hidden="true" />} title="No matching payments" description="Try a different status or search term." />
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {filtered.map((payment) => (
                <li key={payment.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="tnum text-sm font-bold text-navy-900">{payment.order.orderNumber}</p><p className="mt-0.5 truncate text-xs text-muted">{payment.order.event.title}</p></div>
                    <StatusBadge status={payment.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                    <div><p className="text-muted">Amount</p><p className="tnum mt-0.5 font-bold text-navy-900">{formatCurrency(payment.amount)}</p></div>
                    <div><p className="text-muted">Provider</p><p className="mt-0.5 font-semibold text-navy-800">{payment.provider}</p></div>
                    <div className="col-span-2"><p className="text-muted">Customer</p><p className="mt-0.5 font-semibold text-navy-800">{payment.order.user.firstName} {payment.order.user.lastName}</p></div>
                    <p className="col-span-2 text-muted">{formatDateTime(payment.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="table-shell hidden overflow-x-auto md:block">
              <table className="data-table min-w-[900px]">
                <thead><tr><th>Order</th><th>Event</th><th>Customer</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {filtered.map((payment) => (
                    <tr key={payment.id}>
                      <td className="tnum font-bold text-navy-900">{payment.order.orderNumber}</td>
                      <td className="max-w-[230px] truncate text-navy-700">{payment.order.event.title}</td>
                      <td className="text-navy-700">{payment.order.user.firstName} {payment.order.user.lastName}</td>
                      <td className="tnum font-semibold text-navy-900">{formatCurrency(payment.amount)}</td>
                      <td className="text-muted">{payment.provider}</td>
                      <td><StatusBadge status={payment.status} /></td>
                      <td className="whitespace-nowrap text-muted">{formatDateTime(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminPaymentsPage() {
  return <RequireRole roles={['ADMIN']}><AdminPaymentsContent /></RequireRole>;
}
