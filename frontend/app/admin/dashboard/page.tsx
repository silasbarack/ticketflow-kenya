'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import { AdminStats } from '@/types';
import { formatCurrency } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: '\u{1F4CA}' },
  { label: 'Event Approvals', href: '/admin/events', icon: '✅' },
  { label: 'Users', href: '/admin/users', icon: '\u{1F465}' },
  { label: 'Payments', href: '/admin/payments', icon: '\u{1F4B3}' },
];

function AdminDashboardContent() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data as AdminStats;
    },
  });

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers },
    { label: 'Organizers', value: stats?.totalOrganizers },
    { label: 'Customers', value: stats?.totalCustomers },
    { label: 'Total Events', value: stats?.totalEvents },
    { label: 'Published Events', value: stats?.publishedEvents },
    { label: 'Pending Approval', value: stats?.pendingEvents },
    { label: 'Paid Orders', value: stats?.totalOrders },
    { label: 'Tickets Sold', value: stats?.ticketsSold },
    { label: 'Tickets Checked In', value: stats?.ticketsCheckedIn },
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : undefined },
    { label: 'Platform Commission', value: stats ? formatCurrency(stats.totalCommission) : undefined },
  ];

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-gray-500">Platform-wide statistics and moderation tools.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{c.value ?? '-'}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <AdminDashboardContent />
    </RequireRole>
  );
}
