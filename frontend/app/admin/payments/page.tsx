'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, CheckCircle2, Users, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Payment } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

function AdminPaymentsContent() {
  const [status, setStatus] = useState('');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/payments', { params: { status: status || undefined } });
      return data as (Payment & { order: { orderNumber: string; event: { title: string }; user: { firstName: string; lastName: string } } })[];
    },
  });

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-navy-900">Payments</h1>

      <div className="mt-4 flex gap-2">
        {['', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === s ? 'bg-brand-600 text-white' : 'bg-navy-900/5 text-navy-700 hover:bg-navy-900/10'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-navy-400">
                  Loading...
                </td>
              </tr>
            ) : !payments || payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-navy-400">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{p.order.orderNumber}</td>
                  <td className="px-4 py-3 text-navy-600">{p.order.event.title}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {p.order.user.firstName} {p.order.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-navy-600">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-muted">{p.provider}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(p.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default function AdminPaymentsPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <AdminPaymentsContent />
    </RequireRole>
  );
}
