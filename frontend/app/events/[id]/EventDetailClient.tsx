'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { EventItem } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';
import { SERVICE_FEE_PERCENT, serviceFeeFor, totalWithServiceFee } from '@/lib/fees';

export default function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, addToCart, totalItems } = useCart();
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

  const totalSelected = useMemo(
    () => Object.values(quantities).reduce((s, q) => s + q, 0),
    [quantities],
  );

  // Warn if cart already has a different event's tickets
  const cartEventId = cartItems[0]?.eventId;
  const cartEventName = cartItems[0]?.eventTitle;
  const willReplaceCart = cartItems.length > 0 && cartEventId !== event?.id;

  function handleAddToCart() {
    if (totalSelected <= 0) {
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

    if (willReplaceCart) {
      if (!confirm(`Your cart currently has tickets for "${cartEventName}". Adding these will replace your cart. Continue?`)) {
        return;
      }
    }

    let added = 0;
    for (const tt of event!.ticketTypes) {
      const qty = quantities[tt.id] || 0;
      if (qty > 0) {
        addToCart({
          eventId: event!.id,
          eventTitle: event!.title,
          eventSlug: event!.slug,
          eventDateTime: event!.startDateTime,
          eventVenue: event!.venue,
          eventCity: event!.city,
          ticketTypeId: tt.id,
          ticketTypeName: tt.name,
          ticketTypeCategory: tt.category,
          price: Number(tt.price),
          quantity: qty,
        });
        added += qty;
      }
    }

    setQuantities({});
    toast.success(
      `${added} ticket${added !== 1 ? 's' : ''} added to cart`,
      { icon: '🛒', duration: 3000 },
    );
  }

  if (isLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-gray-500">Loading event...</main>;
  }
  if (!event) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-gray-500">Event not found.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-gray-100">
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
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(totalWithServiceFee(Number(tt.price)))}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatCurrency(tt.price)} + {formatCurrency(serviceFeeFor(Number(tt.price)))} fee
                      </p>
                    </div>
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

          <div className="mt-5 space-y-1 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Service fee ({SERVICE_FEE_PERCENT}%)</span>
              <span>{formatCurrency(serviceFeeFor(total))}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-gray-500">You pay</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalWithServiceFee(total))}</span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Add to Cart
          </button>

          {totalItems > 0 && (
            <Link
              href="/cart"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5h14.6M10 21a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              View Cart ({totalItems} ticket{totalItems !== 1 ? 's' : ''})
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
