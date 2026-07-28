'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard, PlusCircle, ScanLine } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EventItem, TicketTypeCategory } from '@/types';
import { formatCurrency, formatTicketCategory } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

const CATEGORIES: TicketTypeCategory[] = ['REGULAR', 'VIP', 'VVIP', 'STUDENT', 'EARLY_BIRD'];

function ManageEventContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ttForm, setTtForm] = useState({ name: '', category: 'REGULAR' as TicketTypeCategory, price: '', quantity: '' });

  const { data: event, isLoading } = useQuery({
    queryKey: ['organizer-event', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/organizer/${params.id}`);
      return data as EventItem;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['organizer-event', params.id] });
    queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
  }

  const addTicketType = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/events/${params.id}/ticket-types`, {
        name: ttForm.name,
        category: ttForm.category,
        price: parseFloat(ttForm.price),
        quantity: parseInt(ttForm.quantity, 10),
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Ticket type added');
      setTtForm({ name: '', category: 'REGULAR', price: '', quantity: '' });
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteTicketType = useMutation({
    mutationFn: async (id: string) => api.delete(`/ticket-types/${id}`),
    onSuccess: () => {
      toast.success('Ticket type removed');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const submitForApproval = useMutation({
    mutationFn: async () => api.patch(`/events/${params.id}/submit-for-approval`),
    onSuccess: () => {
      toast.success('Submitted for admin approval');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cancelEvent = useMutation({
    mutationFn: async () => api.patch(`/events/${params.id}/cancel`),
    onSuccess: () => {
      toast.success('Event cancelled');
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEvent = useMutation({
    mutationFn: async () => api.delete(`/events/${params.id}`),
    onSuccess: () => {
      toast.success('Event deleted');
      router.push('/organizer/dashboard');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !event) {
    return (
      <DashboardLayout items={NAV}>
        <p className="text-muted">Loading event...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout items={NAV}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-muted">
            {event.venue}, {event.city}
          </p>
          {event.rejectionReason && (
            <p className="mt-1 text-sm text-danger-600">Rejected: {event.rejectionReason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-900/5"
          >
            View Attendees
          </Link>
          {['DRAFT', 'REJECTED'].includes(event.status) && (
            <Button size="sm" onClick={() => submitForApproval.mutate()} disabled={submitForApproval.isPending}>
              Submit for Approval
            </Button>
          )}
          {!['CANCELLED', 'COMPLETED'].includes(event.status) && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => cancelEvent.mutate()}
              disabled={cancelEvent.isPending}
            >
              Cancel Event
            </Button>
          )}
          {event.status === 'DRAFT' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteEvent.mutate()}
              disabled={deleteEvent.isPending}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold text-navy-900">Ticket Types</h2>
        <div className="mt-4 space-y-2">
          {event.ticketTypes.length === 0 && <p className="text-sm text-muted">No ticket types yet.</p>}
          {event.ticketTypes.map((tt) => (
            <div key={tt.id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {tt.name} <span className="text-navy-400">({formatTicketCategory(tt.category)})</span>
                </p>
                <p className="text-xs text-muted">
                  {formatCurrency(tt.price)} &middot; {tt.quantitySold}/{tt.quantity} sold
                </p>
              </div>
              <button
                onClick={() => deleteTicketType.mutate(tt.id)}
                disabled={tt.quantitySold > 0}
                className="text-sm font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-40"
                title={tt.quantitySold > 0 ? 'Cannot delete — already sold' : 'Delete'}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTicketType.mutate();
          }}
          className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-5"
        >
          <Input
            required
            placeholder="Name (e.g. VIP)"
            value={ttForm.name}
            onChange={(e) => setTtForm((f) => ({ ...f, name: e.target.value }))}
            className="sm:col-span-2"
          />
          <Select
            value={ttForm.category}
            onChange={(e) => setTtForm((f) => ({ ...f, category: e.target.value as TicketTypeCategory }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatTicketCategory(c)}
              </option>
            ))}
          </Select>
          <Input
            required
            type="number"
            min={0}
            placeholder="Price (KES)"
            value={ttForm.price}
            onChange={(e) => setTtForm((f) => ({ ...f, price: e.target.value }))}
          />
          <Input
            required
            type="number"
            min={1}
            placeholder="Quantity"
            value={ttForm.quantity}
            onChange={(e) => setTtForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <Button type="submit" variant="secondary" disabled={addTicketType.isPending} className="sm:col-span-5">
            + Add Ticket Type
          </Button>
        </form>
      </section>
    </DashboardLayout>
  );
}

export default function ManageEventPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <ManageEventContent />
    </RequireRole>
  );
}
