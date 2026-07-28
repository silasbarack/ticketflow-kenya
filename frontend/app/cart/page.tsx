'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { api, getApiErrorMessage } from '@/lib/api';
import { AttendeeInfo } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { SERVICE_FEE_PERCENT } from '@/lib/fees';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';
import Container from '@/components/ui/Container';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const EMPTY_ATTENDEE: AttendeeInfo = { firstName: '', lastName: '', nationalId: '', email: '', phone: '' };

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount, serviceFee, finalTotal } = useCart();

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
      <Container className="max-w-3xl py-20">
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" aria-hidden="true" />}
          title="Your cart is empty"
          description="Browse events and add tickets to get started."
          action={
            <Link href="/events">
              <Button variant="primary">Browse Events</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  const eventName = items[0].eventTitle;
  const eventDateTime = items[0].eventDateTime;
  const eventVenue = `${items[0].eventVenue}, ${items[0].eventCity}`;

  return (
    <Container className="max-w-4xl py-10">
      <h1 className="text-2xl font-bold text-navy-900">Your Cart</h1>
      <p className="mt-1 text-sm text-muted">Review your tickets and fill in attendee details before paying.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Left: ticket list + attendee forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Event summary card */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Event</p>
            <p className="mt-1 text-lg font-bold text-navy-900">{eventName}</p>
            <p className="mt-0.5 text-sm text-muted">
              {formatDateTime(eventDateTime)} &middot; {eventVenue}
            </p>
          </div>

          {/* Ticket rows */}
          <div className="divide-y divide-line rounded-2xl border border-line bg-white shadow-soft">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-800">Tickets</h2>
            </div>
            {items.map((item) => (
              <div key={item.ticketTypeId} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{item.ticketTypeName}</p>
                  <p className="text-xs text-muted">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.ticketTypeId, item.quantity - 1)}
                      aria-label={`Decrease quantity for ${item.ticketTypeName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-navy-600 hover:border-navy-300 disabled:opacity-40"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-navy-900">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.ticketTypeId, item.quantity + 1)}
                      aria-label={`Increase quantity for ${item.ticketTypeName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-navy-600 hover:border-navy-300"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-navy-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.ticketTypeId)}
                    className="text-navy-300 hover:text-accent-600"
                    aria-label={`Remove ${item.ticketTypeName} from cart`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Attendee forms — only for 2+ tickets */}
          {needsAttendees && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900">Attendee Details</h2>
                <p className="text-sm text-muted">Fill in the details for each ticket holder.</p>
              </div>

              {ticketSlots.map((slot, i) => (
                <div key={`${slot.ticketTypeId}-${i}`} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-800">
                    Ticket {i + 1}
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {slot.ticketTypeName}
                    </span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">First Name *</Label>
                      <Input
                        type="text"
                        value={syncedAttendees[i]?.firstName ?? ''}
                        onChange={(e) => updateAttendee(i, 'firstName', e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        type="text"
                        value={syncedAttendees[i]?.lastName ?? ''}
                        onChange={(e) => updateAttendee(i, 'lastName', e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">National ID *</Label>
                      <Input
                        type="text"
                        value={syncedAttendees[i]?.nationalId ?? ''}
                        onChange={(e) => updateAttendee(i, 'nationalId', e.target.value)}
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email Address *</Label>
                      <Input
                        type="email"
                        value={syncedAttendees[i]?.email ?? ''}
                        onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Phone Number *</Label>
                      <Input
                        type="tel"
                        value={syncedAttendees[i]?.phone ?? ''}
                        onChange={(e) => updateAttendee(i, 'phone', e.target.value)}
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
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h2 className="text-base font-semibold text-navy-900">Order Summary</h2>

            <div className="mt-3 space-y-1.5 text-sm">
              {items.map((item) => (
                <div key={item.ticketTypeId} className="flex justify-between text-navy-600">
                  <span>
                    {item.ticketTypeName} &times; {item.quantity}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-navy-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-navy-600">
                <span>Service fee ({SERVICE_FEE_PERCENT}%)</span>
                <span>{formatCurrency(serviceFee)}</span>
              </div>
            </div>

            <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
              <span className="text-navy-900">Total to pay</span>
              <span className="text-brand-700">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h2 className="text-base font-semibold text-navy-900">M-Pesa Payment</h2>
            <p className="mt-1 text-xs text-muted">An STK Push will be sent to this number after placing the order.</p>
            <div className="mt-3">
              <Label className="text-xs">M-Pesa Phone Number *</Label>
              <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0712345678" />
            </div>

            <Button variant="primary" size="lg" fullWidth className="mt-4" onClick={handlePlaceOrder} loading={placing}>
              {placing ? (
                'Placing order...'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Pay {formatCurrency(finalTotal)} via
                  <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
                </span>
              )}
            </Button>

            {!user && (
              <p className="mt-3 text-center text-xs text-muted">
                <Link href="/login" className="font-medium text-brand-700 hover:underline">
                  Log in
                </Link>{' '}
                to complete your purchase.
              </p>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
