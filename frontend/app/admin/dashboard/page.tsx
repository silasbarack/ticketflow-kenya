'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, CheckCircle2, Users, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import { AdminStats } from '@/types';
import { formatCurrency } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
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
      <h1 className="text-2xl font-bold text-navy-900">Admin Dashboard</h1>
      <p className="mt-1 text-muted">Platform-wide statistics and moderation tools.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">{c.value ?? '-'}</p>
          </Card>
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
