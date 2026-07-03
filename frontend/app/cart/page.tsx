'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { api, getApiErrorMessage } from '@/lib/api';
import { AttendeeInfo } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';

const EMPTY_ATTENDEE: AttendeeInfo = { firstName: '', lastName: '', nationalId: '', email: '', phone: '' };

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount } = useCart();

  const [customerPhone, setCustomerPhone] = useState('');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [placing, setPlacing] = useState(false);

  // Build flat ticket slots for attendee forms whenever items change
  const ticketSlots = useMemo(() => {
    const slots: { ticketTypeId: string; ticketTypeName: string; index: number }[] = [];
    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        slots.push({ ticketTypeId: item.ticketTypeId, ticketTypeName: item.ticketTypeName, index: slots.length });
      }
    });
    return slots;
  }, [items]);

  // Keep attendees array in sync with ticketSlots length
  const syncedAttendees = useMemo(() => {
    const base = Array.from({ length: ticketSlots.length }, (_, i) => attendees[i] ?? { ...EMPTY_ATTENDEE });
    return base;
  }, [ticketSlots.length, attendees]);

  const needsAttendees = totalItems >= 2;

  function updateAttendee(index: number, field: keyof AttendeeInfo, value: string) {
    setAttendees((prev) => {
      const next = Array.from({ length: ticketSlots.length }, (_, i) => prev[i] ?? { ...EMPTY_ATTENDEE });
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function validateAttendees(): boolean {
    for (let i = 0; i < syncedAttendees.length; i++) {
      const a = syncedAttendees[i];
      if (!a.firstName.trim() || !a.lastName.trim()) {
        toast.error(`Enter first and last name for ticket ${i + 1}`);
        return false;
      }
      if (!a.nationalId.trim()) {
        toast.error(`Enter National ID for ticket ${i + 1}`);
        return false;
      }
      if (!a.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) {
        toast.error(`Enter a valid email for ticket ${i + 1}`);
        return false;
      }
      if (!a.phone.trim() || !isValidKenyanPhone(a.phone)) {
        toast.error(`Enter a valid Kenyan phone number for ticket ${i + 1}`);
        return false;
      }
    }
    return true;
  }

  async function handlePlaceOrder() {
    if (items.length === 0) return;

    if (!user) {
      toast.error('Please log in to place an order');
      router.push('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customer accounts can purchase tickets');
      return;
    }
    if (!customerPhone.trim() || !isValidKenyanPhone(customerPhone)) {
      toast.error(KENYA_PHONE_MESSAGE);
      return;
    }
    if (needsAttendees && !validateAttendees()) return;

    // Build attendees per orderItem
    let slotIndex = 0;
    const orderItems = items.map((item) => {
      const itemAttendees = needsAttendees
        ? syncedAttendees.slice(slotIndex, slotIndex + item.quantity)
        : undefined;
      slotIndex += item.quantity;
      return {
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        ...(itemAttendees ? { attendees: itemAttendees } : {}),
      };
    });

    setPlacing(true);
    try {
      const { data: order } = await api.post('/orders', {
        eventId: items[0].eventId,
        customerPhone: customerPhone.trim(),
        items: orderItems,
      });
      clearCart();
      router.push(`/checkout/${order.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5h14.6M10 21a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Browse events and add tickets to get started.</p>
        <Link
          href="/events"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse Events
        </Link>
      </main>
    );
  }

  const eventName = items[0].eventTitle;
  const eventDateTime = items[0].eventDateTime;
  const eventVenue = `${items[0].eventVenue}, ${items[0].eventCity}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
      <p className="mt-1 text-sm text-gray-500">
        Review your tickets and fill in attendee details before paying.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Left: ticket list + attendee forms */}
        <div className="lg:col-span-2 space-y-6">

          {/* Event summary card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Event</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{eventName}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {formatDateTime(eventDateTime)} &middot; {eventVenue}
            </p>
          </div>

          {/* Ticket rows */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Tickets</h2>
            </div>
            {items.map((item) => (
              <div key={item.ticketTypeId} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.ticketTypeName}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.ticketTypeId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.ticketTypeId, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.ticketTypeId)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Remove"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Attendee forms — only for 2+ tickets */}
          {needsAttendees && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Attendee Details</h2>
                <p className="text-sm text-gray-500">
                  Fill in the details for each ticket holder.
                </p>
              </div>

              {ticketSlots.map((slot, i) => (
                <div key={`${slot.ticketTypeId}-${i}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-gray-700">
                    Ticket {i + 1}
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {slot.ticketTypeName}
                    </span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">First Name *</label>
                      <input
                        type="text"
                        value={syncedAttendees[i]?.firstName ?? ''}
                        onChange={(e) => updateAttendee(i, 'firstName', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Last Name *</label>
                      <input
                        type="text"
                        value={syncedAttendees[i]?.lastName ?? ''}
                        onChange={(e) => updateAttendee(i, 'lastName', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">National ID *</label>
                      <input
                        type="text"
                        value={syncedAttendees[i]?.nationalId ?? ''}
                        onChange={(e) => updateAttendee(i, 'nationalId', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Email Address *</label>
                      <input
                        type="email"
                        value={syncedAttendees[i]?.email ?? ''}
                        onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600">Phone Number *</label>
                      <input
                        type="tel"
                        value={syncedAttendees[i]?.phone ?? ''}
                        onChange={(e) => updateAttendee(i, 'phone', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="0712345678"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: order summary + payment */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>

            <div className="mt-3 space-y-1.5 text-sm">
              {items.map((item) => (
                <div key={item.ticketTypeId} className="flex justify-between text-gray-600">
                  <span>{item.ticketTypeName} × {item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t border-gray-200 pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-brand-700">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="mt-1 text-xs text-gray-400">Inclusive of 7% platform fee</div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">M-Pesa Payment</h2>
            <p className="mt-1 text-xs text-gray-500">
              An STK Push will be sent to this number after placing the order.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600">M-Pesa Phone Number *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="0712345678"
              />
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {placing ? 'Placing order...' : `Pay ${formatCurrency(totalAmount)} via M-Pesa`}
            </button>

            {!user && (
              <p className="mt-3 text-center text-xs text-gray-500">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Log in
                </Link>{' '}
                to complete your purchase.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
