'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { EventItem } from '@/types';
import { formatDate } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: '\u{1F4CA}' },
  { label: 'Event Approvals', href: '/admin/events', icon: '✅' },
  { label: 'Users', href: '/admin/users', icon: '\u{1F465}' },
  { label: 'Payments', href: '/admin/payments', icon: '\u{1F4B3}' },
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
      <h1 className="text-2xl font-bold text-gray-900">Event Approvals</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : !events || events.length === 0 ? (
          <p className="text-gray-500">No events with this status.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {event.venue}, {event.city} &middot; {formatDate(event.startDateTime)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
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
                      <button
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection?') || 'Did not meet guidelines';
                          reject.mutate({ id: event.id, reason });
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {event.status === 'PUBLISHED' && (
                    <button
                      onClick={() => suspend.mutate(event.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
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
