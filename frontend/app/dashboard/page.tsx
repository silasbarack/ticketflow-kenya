'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

function CustomerDashboardContent() {
  const { user } = useAuth();

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders/my');
      return data as Order[];
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
      <p className="mt-1 text-gray-500">Manage your tickets and orders.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/tickets"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">My Tickets</h2>
          <p className="mt-1 text-sm text-gray-500">View and download your e-tickets with QR codes.</p>
        </Link>
        <Link
          href="/events"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">Browse Events</h2>
          <p className="mt-1 text-sm text-gray-500">Find new events and buy tickets.</p>
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Recent Orders</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!orders || orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{order.event.title}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function CustomerDashboardPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <CustomerDashboardContent />
    </RequireRole>
  );
}
