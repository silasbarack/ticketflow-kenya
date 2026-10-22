'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import FilterTabs from '@/components/ui/FilterTabs';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Input';
import { EventItem } from '@/types';
import { formatDate } from '@/lib/format';
import { ADMIN_NAV as NAV } from '@/lib/admin-nav';

const MONTH = new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' });
const DAY = new Intl.DateTimeFormat('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' });


const STATUS_FILTERS = ['PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'DRAFT', 'COMPLETED'] as const;
type EventStatusFilter = (typeof STATUS_FILTERS)[number];
type AdminEvent = EventItem & { organizer: { user: { firstName: string; lastName: string } } };
type PendingAction = { kind: 'reject' | 'suspend'; event: AdminEvent } | null;

function AdminEventsContent() {
  const [status, setStatus] = useState<EventStatusFilter>('PENDING_APPROVAL');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-events', status],
    queryFn: async () => {
      const { data } = await api.get('/admin/events', { params: { status } });
      return data as AdminEvent[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  }

  const approve = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/events/${id}/approve`),
    onSuccess: () => { toast.success('Event approved and published'); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason: rejectionReason }: { id: string; reason: string }) => api.patch(`/admin/events/${id}/reject`, { reason: rejectionReason }),
    onSuccess: () => { toast.success('Event rejected'); setPendingAction(null); setReason(''); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/events/${id}/suspend`),
    onSuccess: () => { toast.success('Event suspended'); setPendingAction(null); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const actionPending = reject.isPending || suspend.isPending;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Moderation queue"
        title="Event approvals"
        description="Review organizer submissions and manage the publishing status of live events."
      />

      <div className="mt-6">
        <FilterTabs
          value={status}
          options={STATUS_FILTERS.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
          onChange={setStatus}
          label="Filter events by status"
        />
      </div>

      <section className="mt-6 space-y-3" aria-live="polite">
        {isLoading ? (
          [0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-card" />)
        ) : isError ? (
          <EmptyState title="Events could not be loaded" description="Check the connection and try again." action={<Button onClick={() => refetch()}>Try again</Button>} />
        ) : !events?.length ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />} title="No events in this queue" description={`There are no ${status.toLowerCase().replaceAll('_', ' ')} events right now.`} />
        ) : (
          events.map((event) => (
            <article key={event.id} className="group overflow-hidden rounded-card border border-line bg-white shadow-soft transition duration-200 hover:shadow-card">
              <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex items-center gap-4 sm:contents">
                  <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl bg-ink-900 text-white shadow-card">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand-400">{MONTH.format(new Date(event.startDateTime))}</span>
                    <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.03em]">{DAY.format(new Date(event.startDateTime))}</span>
                  </div>
                  {event.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.posterUrl} alt={event.posterAlt ?? ''} className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover ring-1 ring-inset ring-black/5 sm:w-24" loading="lazy" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-navy-900">{event.title}</h2>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />{formatDate(event.startDateTime)}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />{event.venue}, {event.city}</span>
                    <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /><span className="font-semibold text-navy-700">{event.organizer?.user?.firstName} {event.organizer?.user?.lastName}</span></span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {event.status === 'PENDING_APPROVAL' && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => approve.mutate(event.id)} loading={approve.isPending}>Approve</Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingAction({ kind: 'reject', event })}>Reject</Button>
                    </>
                  )}
                  {event.status === 'PUBLISHED' && <Button variant="outline" size="sm" onClick={() => setPendingAction({ kind: 'suspend', event })}>Suspend</Button>}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === 'reject' ? 'Reject this event?' : 'Suspend this live event?'}
        description={pendingAction?.kind === 'reject' ? `The organizer will see the reason and can revise “${pendingAction?.event.title ?? ''}”.` : `“${pendingAction?.event.title ?? ''}” will stop appearing as a bookable live event.`}
        confirmLabel={pendingAction?.kind === 'reject' ? 'Reject event' : 'Suspend event'}
        pending={actionPending}
        onClose={() => { setPendingAction(null); setReason(''); }}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.kind === 'reject') {
            if (!reason.trim()) { toast.error('Add a clear reason for the organizer'); return; }
            reject.mutate({ id: pendingAction.event.id, reason: reason.trim() });
          } else {
            suspend.mutate(pendingAction.event.id);
          }
        }}
      >
        {pendingAction?.kind === 'reject' && (
          <label className="block text-sm font-semibold text-navy-800">
            Reason for rejection
            <Textarea className="mt-2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs to change" autoFocus />
          </label>
        )}
      </ConfirmDialog>
    </DashboardLayout>
  );
}

export default function AdminEventsPage() {
  return <RequireRole roles={['ADMIN']}><AdminEventsContent /></RequireRole>;
}
