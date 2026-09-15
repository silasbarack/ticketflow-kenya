'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, LayoutDashboard, Search, UserRoundX, Users } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import FilterTabs from '@/components/ui/FilterTabs';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { User, UserRole } from '@/types';
import { formatDate } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

type RoleFilter = '' | UserRole;
const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: '', label: 'All accounts' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'ORGANIZER', label: 'Organizers' },
  { value: 'ADMIN', label: 'Admins' },
];

function AdminUsersContent() {
  const [role, setRole] = useState<RoleFilter>('');
  const [search, setSearch] = useState('');
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['admin-users', role],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', { params: { role: role || undefined } });
      return data as User[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => api.patch(`/admin/users/${id}/${activate ? 'activate' : 'suspend'}`),
    onSuccess: (_, variables) => {
      toast.success(variables.activate ? 'Account activated' : 'Account suspended');
      setUserToSuspend(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users ?? [];
    return (users ?? []).filter((user) => `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(needle));
  }, [search, users]);

  function accountAction(user: User) {
    if (user.isActive) setUserToSuspend(user);
    else toggleActive.mutate({ id: user.id, activate: true });
  }

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Access control" title="Users" description="Find customer and organizer accounts, inspect access status and suspend accounts when required." />

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block max-w-md">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="pl-11" />
        </label>
        <FilterTabs value={role} options={FILTERS} onChange={setRole} label="Filter users by role" />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-72 rounded-card" />
        ) : isError ? (
          <EmptyState title="Users could not be loaded" description="Try refreshing this page in a moment." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" aria-hidden="true" />} title="No matching users" description="Try a different account type or search term." />
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {filtered.map((user) => (
                <li key={user.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-navy-900">{user.firstName} {user.lastName}</p><p className="mt-0.5 truncate text-xs text-muted">{user.email}</p></div>
                    <Badge tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Suspended'}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <div><p className="text-xs font-semibold text-navy-700">{user.role}</p><p className="text-[11px] text-muted">Joined {formatDate(user.createdAt)}</p></div>
                    {user.role !== 'ADMIN' && <Button variant={user.isActive ? 'danger' : 'outline'} size="sm" onClick={() => accountAction(user)} loading={toggleActive.isPending}>{user.isActive ? 'Suspend' : 'Activate'}</Button>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="table-shell hidden overflow-x-auto md:block">
              <table className="data-table min-w-[760px]">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td className="font-bold text-navy-900">{user.firstName} {user.lastName}</td>
                      <td className="text-navy-700">{user.email}</td>
                      <td className="text-navy-700">{user.role}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(user.createdAt)}</td>
                      <td><Badge tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Suspended'}</Badge></td>
                      <td className="text-right">{user.role !== 'ADMIN' && <button type="button" onClick={() => accountAction(user)} className={user.isActive ? 'font-bold text-danger-700 hover:underline' : 'font-bold text-brand-700 hover:underline'}>{user.isActive ? 'Suspend' : 'Activate'}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(userToSuspend)}
        title="Suspend this account?"
        description={`${userToSuspend?.firstName ?? 'This user'} will lose access to TicketFlow until an administrator activates the account again.`}
        confirmLabel="Suspend account"
        pending={toggleActive.isPending}
        onClose={() => setUserToSuspend(null)}
        onConfirm={() => userToSuspend && toggleActive.mutate({ id: userToSuspend.id, activate: false })}
      />
    </DashboardLayout>
  );
}

export default function AdminUsersPage() {
  return <RequireRole roles={['ADMIN']}><AdminUsersContent /></RequireRole>;
}
