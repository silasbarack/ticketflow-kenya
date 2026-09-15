'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, LayoutDashboard, MapPin, PlusCircle, ScanLine, Send, Ticket, Trash2, Users } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Button, { buttonVariants } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Label, Select } from '@/components/ui/Input';
import { EventItem, TicketTypeCategory } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];
const CATEGORIES: TicketTypeCategory[] = ['REGULAR', 'VIP', 'VVIP', 'STUDENT', 'EARLY_BIRD'];
type ConfirmAction = { kind: 'cancel' | 'delete-event' | 'delete-tier'; id?: string; label?: string } | null;

function ManageEventContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [ticketForm, setTicketForm] = useState({ name: '', category: 'REGULAR' as TicketTypeCategory, price: '', quantity: '' });

  const eventQuery = useQuery({
    queryKey: ['organizer-event', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/organizer/${params.id}`);
      return data as EventItem;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['organizer-event', params.id] });
    queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
    queryClient.invalidateQueries({ queryKey: ['organizer-stats'] });
  }

  const addTicketType = useMutation({
    mutationFn: async () => api.post(`/events/${params.id}/ticket-types`, { name: ticketForm.name, category: ticketForm.category, price: parseFloat(ticketForm.price), quantity: parseInt(ticketForm.quantity, 10) }),
    onSuccess: () => { toast.success('Ticket tier added'); setTicketForm({ name: '', category: 'REGULAR', price: '', quantity: '' }); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const deleteTicketType = useMutation({
    mutationFn: async (id: string) => api.delete(`/ticket-types/${id}`),
    onSuccess: () => { toast.success('Ticket tier removed'); setConfirmAction(null); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const submitForApproval = useMutation({
    mutationFn: async () => api.patch(`/events/${params.id}/submit-for-approval`),
    onSuccess: () => { toast.success('Submitted for admin approval'); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const cancelEvent = useMutation({
    mutationFn: async () => api.patch(`/events/${params.id}/cancel`),
    onSuccess: () => { toast.success('Event cancelled'); setConfirmAction(null); invalidate(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const deleteEvent = useMutation({
    mutationFn: async () => api.delete(`/events/${params.id}`),
    onSuccess: () => { toast.success('Event deleted'); router.push('/organizer/dashboard'); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (eventQuery.isLoading) return <DashboardLayout items={NAV}><Skeleton className="h-80 rounded-card" /></DashboardLayout>;
  const event = eventQuery.data;
  if (!event) return <DashboardLayout items={NAV}><EmptyState title="Event not found" description="This event may have been removed or you may not have access to it." /></DashboardLayout>;

  const sold = event.ticketTypes.reduce((sum, tier) => sum + tier.quantitySold, 0);
  const capacity = event.ticketTypes.reduce((sum, tier) => sum + tier.quantity, 0);
  const destructivePending = deleteTicketType.isPending || cancelEvent.isPending || deleteEvent.isPending;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Event management"
        title={event.title}
        description={`${event.venue}, ${event.city} · ${formatDateTime(event.startDateTime)}`}
        actions={<>
          <Link href={`/organizer/events/${event.id}/attendees`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Users className="h-4 w-4" aria-hidden="true" />Attendees</Link>
          {['DRAFT', 'REJECTED'].includes(event.status) && <Button size="sm" onClick={() => submitForApproval.mutate()} loading={submitForApproval.isPending}><Send className="h-4 w-4" aria-hidden="true" />Submit for approval</Button>}
        </>}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft">
        <StatusBadge status={event.status} />
        <span className="h-4 w-px bg-line" aria-hidden="true" />
        <span className="flex items-center gap-1.5 text-xs text-muted"><Ticket className="h-3.5 w-3.5" aria-hidden="true" />{sold}/{capacity} tickets sold</span>
        <span className="flex items-center gap-1.5 text-xs text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{event.city}</span>
        {event.rejectionReason && <p className="w-full rounded-btn bg-danger-50 px-3 py-2 text-sm font-medium text-danger-800">Admin feedback: {event.rejectionReason}</p>}
      </div>

      <section className="mt-7 rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="page-kicker">Inventory</p><h2 className="section-title mt-2">Ticket tiers</h2><p className="mt-1 text-sm text-muted">Set a clear name, category, price and quantity for every access level.</p></div>
          <span className="tnum text-xs text-muted">{event.ticketTypes.length} tier{event.ticketTypes.length === 1 ? '' : 's'}</span>
        </div>

        <div className="mt-5 space-y-3">
          {event.ticketTypes.length === 0 ? (
            <div className="rounded-btn border border-dashed border-line bg-cream/60 p-5 text-sm text-muted">No ticket tiers yet. Add the first one below before submitting the event.</div>
          ) : event.ticketTypes.map((tier) => (
            <article key={tier.id} className="flex flex-col gap-3 rounded-btn border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="text-sm font-bold text-navy-900">{tier.name}</p><p className="mt-1 text-xs text-muted">{formatTicketCategory(tier.category)} · {formatCurrency(tier.price)} · <span className="tnum">{tier.quantitySold}/{tier.quantity}</span> sold</p></div>
              <Button variant="ghost" size="sm" disabled={tier.quantitySold > 0} title={tier.quantitySold > 0 ? 'Sold tiers cannot be removed' : 'Remove ticket tier'} onClick={() => setConfirmAction({ kind: 'delete-tier', id: tier.id, label: tier.name })}><Trash2 className="h-4 w-4 text-danger-700" aria-hidden="true" />Remove</Button>
            </article>
          ))}
        </div>

        <form onSubmit={(formEvent) => { formEvent.preventDefault(); addTicketType.mutate(); }} className="mt-6 border-t border-line pt-6">
          <h3 className="text-sm font-bold text-navy-900">Add a ticket tier</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div><Label htmlFor="tier-name">Tier name</Label><Input id="tier-name" required placeholder="e.g. VIP Balcony" value={ticketForm.name} onChange={(e) => setTicketForm((current) => ({ ...current, name: e.target.value }))} /></div>
            <div><Label htmlFor="tier-category">Category</Label><Select id="tier-category" value={ticketForm.category} onChange={(e) => setTicketForm((current) => ({ ...current, category: e.target.value as TicketTypeCategory }))}>{CATEGORIES.map((category) => <option key={category} value={category}>{formatTicketCategory(category)}</option>)}</Select></div>
            <div><Label htmlFor="tier-price">Price (KES)</Label><Input id="tier-price" required type="number" min={0} inputMode="decimal" placeholder="3500" value={ticketForm.price} onChange={(e) => setTicketForm((current) => ({ ...current, price: e.target.value }))} /></div>
            <div><Label htmlFor="tier-quantity">Quantity</Label><Input id="tier-quantity" required type="number" min={1} inputMode="numeric" placeholder="100" value={ticketForm.quantity} onChange={(e) => setTicketForm((current) => ({ ...current, quantity: e.target.value }))} /></div>
          </div>
          <Button type="submit" variant="secondary" className="mt-4" loading={addTicketType.isPending}><PlusCircle className="h-4 w-4" aria-hidden="true" />Add ticket tier</Button>
        </form>
      </section>

      <section className="mt-7 rounded-card border border-danger-100 bg-danger-50/55 p-5 sm:p-6">
        <h2 className="section-title text-danger-900">Event controls</h2>
        <p className="mt-1 text-sm text-danger-800/75">These actions affect listing visibility and cannot be hidden from attendees who already purchased.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!['CANCELLED', 'COMPLETED'].includes(event.status) && <Button variant="danger" size="sm" onClick={() => setConfirmAction({ kind: 'cancel' })}>Cancel event</Button>}
          {event.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => setConfirmAction({ kind: 'delete-event' })}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete draft</Button>}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.kind === 'cancel' ? 'Cancel this event?' : confirmAction?.kind === 'delete-event' ? 'Delete this draft?' : `Remove ${confirmAction?.label ?? 'this ticket tier'}?`}
        description={confirmAction?.kind === 'cancel' ? 'Ticket sales will stop and the event will be marked cancelled. Existing customer records remain in the system.' : confirmAction?.kind === 'delete-event' ? 'This draft will be permanently deleted. This cannot be undone.' : 'This ticket tier will be permanently removed from the event.'}
        confirmLabel={confirmAction?.kind === 'cancel' ? 'Cancel event' : confirmAction?.kind === 'delete-event' ? 'Delete draft' : 'Remove tier'}
        pending={destructivePending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.kind === 'cancel') cancelEvent.mutate();
          if (confirmAction?.kind === 'delete-event') deleteEvent.mutate();
          if (confirmAction?.kind === 'delete-tier' && confirmAction.id) deleteTicketType.mutate(confirmAction.id);
        }}
      />
    </DashboardLayout>
  );
}

export default function ManageEventPage() {
  return <RequireRole roles={['ORGANIZER']}><ManageEventContent /></RequireRole>;
}
