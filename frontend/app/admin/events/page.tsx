'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard, CheckCircle2, Users, CreditCard } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EventItem } from '@/types';
import { formatDate } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

const STATUS_FILTERS = ['PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'DRAFT', 'COMPLETED'];

function AdminEventsContent() {
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/events', { params: { status } });
      return data as (EventItem & { organizer: { user: { firstName: string; lastName: string } } })[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-events'] });
  }

  const approve = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/events/${id}/approve`),
    onSuccess: () => {
      toast.success('Event approved and published');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/admin/events/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Event rejected');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/events/${id}/suspend`),
    onSuccess: () => {
      toast.success('Event suspended');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-navy-900">Event Approvals</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === s ? 'bg-brand-600 text-white' : 'bg-navy-900/5 text-navy-700 hover:bg-navy-900/10'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !events || events.length === 0 ? (
          <p className="text-muted">No events with this status.</p>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy-900">{event.title}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {event.venue}, {event.city} &middot; {formatDate(event.startDateTime)}
                  </p>
                  <p className="mt-1 text-xs text-navy-400">
                    Organizer: {event.organizer?.user?.firstName} {event.organizer?.user?.lastName}
                  </p>
                </div>
                <div className="flex gap-2">
                  {event.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => approve.mutate(event.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-auto min-h-0 px-3 py-1.5 text-xs"
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection?') || 'Did not meet guidelines';
                          reject.mutate({ id: event.id, reason });
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {event.status === 'PUBLISHED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-auto min-h-0 px-3 py-1.5 text-xs"
                      onClick={() => suspend.mutate(event.id)}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminEventsPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <AdminEventsContent />
    </RequireRole>
  );
}
