'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { EventItem, TicketTypeCategory } from '@/types';
import { formatCurrency, formatTicketCategory } from '@/lib/format';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: '\u{1F4CA}' },
  { label: 'Create Event', href: '/organizer/events/create', icon: '➕' },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: '\u{1F4F1}' },
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
        <p className="text-gray-500">Loading event...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout items={NAV}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-gray-500">
            {event.venue}, {event.city}
          </p>
          {event.rejectionReason && (
            <p className="mt-1 text-sm text-red-600">Rejected: {event.rejectionReason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            View Attendees
          </Link>
          {['DRAFT', 'REJECTED'].includes(event.status) && (
            <button
              onClick={() => submitForApproval.mutate()}
              disabled={submitForApproval.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Submit for Approval
            </button>
          )}
          {!['CANCELLED', 'COMPLETED'].includes(event.status) && (
            <button
              onClick={() => cancelEvent.mutate()}
              disabled={cancelEvent.isPending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel Event
            </button>
          )}
          {event.status === 'DRAFT' && (
            <button
              onClick={() => deleteEvent.mutate()}
              disabled={deleteEvent.isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Ticket Types</h2>
        <div className="mt-4 space-y-2">
          {event.ticketTypes.length === 0 && <p className="text-sm text-gray-500">No ticket types yet.</p>}
          {event.ticketTypes.map((tt) => (
            <div key={tt.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {tt.name} <span className="text-gray-400">({formatTicketCategory(tt.category)})</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(tt.price)} &middot; {tt.quantitySold}/{tt.quantity} sold
                </p>
              </div>
              <button
                onClick={() => deleteTicketType.mutate(tt.id)}
                disabled={tt.quantitySold > 0}
                className="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
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
          className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-5"
        >
          <input
            required
            placeholder="Name (e.g. VIP)"
            value={ttForm.name}
            onChange={(e) => setTtForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={ttForm.category}
            onChange={(e) => setTtForm((f) => ({ ...f, category: e.target.value as TicketTypeCategory }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatTicketCategory(c)}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min={0}
            placeholder="Price (KES)"
            value={ttForm.price}
            onChange={(e) => setTtForm((f) => ({ ...f, price: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            min={1}
            placeholder="Quantity"
            value={ttForm.quantity}
            onChange={(e) => setTtForm((f) => ({ ...f, quantity: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addTicketType.isPending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 sm:col-span-5"
          >
            + Add Ticket Type
          </button>
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
