'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { EventItem } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${params.id}`);
      return data as EventItem;
    },
  });

  const total = useMemo(() => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, tt) => sum + (quantities[tt.id] || 0) * Number(tt.price), 0);
  }, [event, quantities]);

  const createOrder = useMutation({
    mutationFn: async () => {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
      const { data } = await api.post('/orders', { eventId: event!.id, items });
      return data;
    },
    onSuccess: (order) => {
      router.push(`/checkout/${order.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-gray-500">Loading event...</main>;
  }
  if (!event) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-gray-500">Event not found.</main>;
  }

  function handleBuy() {
    if (total <= 0) {
      toast.error('Select at least one ticket');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customer accounts can purchase tickets');
      return;
    }
    createOrder.mutate();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-gray-100 sm:h-80">
        {event.posterUrl && (
          <Image src={event.posterUrl} alt={event.title} fill className="object-cover" unoptimized />
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {event.category?.name}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="mt-2 text-gray-500">
            {formatDateTime(event.startDateTime)} &middot; {event.venue}, {event.city}
          </p>
          {event.organizer && (
            <p className="mt-1 text-sm text-gray-400">Hosted by {event.organizer.companyName}</p>
          )}
          <p className="mt-6 whitespace-pre-line text-gray-700">{event.description}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Select Tickets</h2>
          <div className="mt-4 space-y-4">
            {event.ticketTypes.length === 0 && <p className="text-sm text-gray-500">No tickets available yet.</p>}
            {event.ticketTypes.map((tt) => {
              const available = tt.quantity - tt.quantitySold;
              return (
                <div key={tt.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tt.name}</p>
                      <p className="text-xs text-gray-500">{formatTicketCategory(tt.category)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(tt.price)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {available > 0 ? `${available} left` : 'Sold out'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border border-gray-300 text-gray-600 disabled:opacity-40"
                        disabled={!quantities[tt.id]}
                        onClick={() =>
                          setQuantities((q) => ({ ...q, [tt.id]: Math.max(0, (q[tt.id] || 0) - 1) }))
                        }
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{quantities[tt.id] || 0}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border border-gray-300 text-gray-600 disabled:opacity-40"
                        disabled={available <= (quantities[tt.id] || 0)}
                        onClick={() => setQuantities((q) => ({ ...q, [tt.id]: (q[tt.id] || 0) + 1 }))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-sm font-medium text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>

          <button
            onClick={handleBuy}
            disabled={createOrder.isPending}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {createOrder.isPending ? 'Creating order...' : 'Buy Ticket'}
          </button>
        </div>
      </div>
    </main>
  );
}
