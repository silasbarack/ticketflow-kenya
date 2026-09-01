'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Info,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Ticket as TicketIcon,
  Users,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { api, getApiErrorMessage } from '@/lib/api';
import { AttendeeInfo, CartItem, EventItem } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { SERVICE_FEE_PERCENT, serviceFeeFor, totalWithServiceFee } from '@/lib/fees';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';
import { tierLabel } from '@/lib/tiers';
import Container from '@/components/ui/Container';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import TicketTierSelector from '@/components/TicketTierSelector';
import BookingSteps, { BookingStepId } from '@/components/BookingSteps';

const EMPTY_ATTENDEE: AttendeeInfo = { firstName: '', lastName: '', nationalId: '', email: '', phone: '' };

/** Attendee details are collected once a buyer takes more than one ticket. */
const ATTENDEE_THRESHOLD = 2;

function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { items, replaceCart, clearCart } = useCart();

  const [step, setStep] = useState<Exclude<BookingStepId, 'pay'>>('tickets');
  const [customerPhone, setCustomerPhone] = useState('');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [placing, setPlacing] = useState(false);

  /*
   * "Book Now" lands here as /cart?event=<slug>. With no slug we fall back to
   * whatever event the cart already holds, so a returning buyer picks up where
   * they left off instead of seeing an empty picker.
   */
  const eventParam = searchParams.get('event');
  const activeSlug = eventParam ?? items[0]?.eventSlug ?? null;

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['booking-event', activeSlug],
    queryFn: async () => {
      const { data } = await api.get(`/events/${activeSlug}`);
      return data as EventItem;
    },
    enabled: Boolean(activeSlug),
  });

  // Only lines belonging to the event being booked count toward this order.
  const eventItems = useMemo(
    () => (event ? items.filter((i) => i.eventId === event.id) : []),
    [items, event],
  );
  const otherEventInCart = items.length > 0 && event ? items[0].eventId !== event.id : false;

  const quantities = useMemo(
    () => Object.fromEntries(eventItems.map((i) => [i.ticketTypeId, i.quantity])) as Record<string, number>,
    [eventItems],
  );

  const totalItems = eventItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = eventItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const serviceFee = serviceFeeFor(subtotal);
  const finalTotal = totalWithServiceFee(subtotal);
  const needsAttendees = totalItems >= ATTENDEE_THRESHOLD;

  /*
   * The cart is the source of truth for the selection, so every tap on the
   * picker rewrites this event's lines. Selecting anything while another
   * event's tickets are in the cart replaces them — one order, one event.
   */
  function setQuantity(ticketTypeId: string, quantity: number) {
    if (!event) return;
    const next = { ...quantities, [ticketTypeId]: quantity };
    const lines: CartItem[] = event.ticketTypes
      .filter((tt) => (next[tt.id] ?? 0) > 0)
      .map((tt) => ({
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        eventDateTime: event.startDateTime,
        eventVenue: event.venue,
        eventCity: event.city,
        ticketTypeId: tt.id,
        ticketTypeName: tt.name,
        ticketTypeCategory: tt.category,
        price: Number(tt.price),
        quantity: next[tt.id] ?? 0,
      }));
    replaceCart(lines);
  }

  const ticketSlots = useMemo(() => {
    const slots: { ticketTypeId: string; ticketTypeName: string }[] = [];
    eventItems.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        slots.push({ ticketTypeId: item.ticketTypeId, ticketTypeName: item.ticketTypeName });
      }
    });
    return slots;
  }, [eventItems]);

  const syncedAttendees = useMemo(
    () => Array.from({ length: ticketSlots.length }, (_, i) => attendees[i] ?? { ...EMPTY_ATTENDEE }),
    [ticketSlots.length, attendees],
  );

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

  function goToNextFromTickets() {
    if (totalItems <= 0) {
      toast.error('Select at least one ticket tier to continue');
      return;
    }
    setStep(needsAttendees ? 'attendees' : 'confirm');
  }

  async function handleConfirmNumber() {
    if (eventItems.length === 0) return;

    if (!user) {
      toast.error('Log in to confirm your order — your selection is saved.');
      router.push('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customer accounts can purchase tickets');
      return;
    }
    if (!isValidKenyanPhone(customerPhone)) {
      toast.error(KENYA_PHONE_MESSAGE);
      return;
    }
    if (needsAttendees && !validateAttendees()) return;

    let slotIndex = 0;
    const orderItems = eventItems.map((item) => {
      const itemAttendees = needsAttendees ? syncedAttendees.slice(slotIndex, slotIndex + item.quantity) : undefined;
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
        eventId: eventItems[0].eventId,
        customerPhone: customerPhone.trim(),
        items: orderItems,
      });
      clearCart();
      // Second entry of the number — and the STK push — happens on checkout.
      router.push(`/checkout/${order.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setPlacing(false);
    }
  }

  /* ── Nothing to book ─────────────────────────────────────────────────── */
  if (!activeSlug) {
    return (
      <Container className="max-w-3xl py-20">
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" aria-hidden="true" />}
          title="Your cart is empty"
          description="Pick an event and hit Book Now — you'll choose your ticket tier right here."
          action={
            <Link href="/events">
              <Button variant="primary">Browse events</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  if (eventLoading || !event) {
    return (
      <Container className="max-w-3xl py-20">
        <p className="text-muted">{eventLoading ? 'Loading your event…' : 'That event could not be found.'}</p>
      </Container>
    );
  }

  const bookable = event.isBookable !== false && event.bookingMode !== 'EXTERNAL';

  if (!bookable) {
    return (
      <Container className="max-w-3xl py-20">
        <EmptyState
          icon={<Info className="h-6 w-6" aria-hidden="true" />}
          title="Not on sale through TicketFlow Kenya"
          description={`Tickets for ${event.title} are not sold on this platform. The event page has the organizer's details.`}
          action={
            <Link href={`/events/${event.slug}`}>
              <Button variant="primary">View event info</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <main className="pb-16">
      {/* ── Flow header: what you're booking, and where you are in it ───── */}
      <section className="ember-ground text-white">
        <Container className="py-7 sm:py-9">
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to event
          </Link>

          <h1 className="mt-3 font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-white/65">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(event.startDateTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {event.venue}, {event.city}
            </span>
          </div>

          <BookingSteps current={step} showAttendees={needsAttendees} className="mt-7 max-w-2xl" />
        </Container>
      </section>

      <Container className="grid gap-8 py-8 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:py-10">
        {/* ── Step content ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {otherEventInCart && (
            <p className="flex items-start gap-2.5 rounded-card border border-accent-200 bg-accent-50 p-4 text-[13px] text-accent-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Your cart still holds tickets for <strong>{items[0].eventTitle}</strong>. Choosing a tier below replaces
                them — an order covers one event at a time.
              </span>
            </p>
          )}

          {step === 'tickets' && (
            <>
              <header>
                <p className="eyebrow text-brand-700">Step 1</p>
                <h2 className="mt-1.5 font-display text-xl font-bold text-navy-900">Choose your ticket tier</h2>
                <p className="mt-1 text-sm text-muted">
                  Every tier below is a category set by the organizer. Prices shown are the face value — the{' '}
                  {SERVICE_FEE_PERCENT}% service fee is added in the summary.
                </p>
              </header>

              <TicketTierSelector ticketTypes={event.ticketTypes} quantities={quantities} onChange={setQuantity} />
            </>
          )}

          {step === 'attendees' && (
            <>
              <header>
                <p className="eyebrow text-brand-700">Step 2</p>
                <h2 className="mt-1.5 font-display text-xl font-bold text-navy-900">Who is coming?</h2>
                <p className="mt-1 text-sm text-muted">
                  You&apos;re buying {totalItems} tickets, so each one needs a named holder. Every ticket is issued as an
                  individual QR code.
                </p>
              </header>

              {ticketSlots.map((slot, i) => (
                <div
                  key={`${slot.ticketTypeId}-${i}`}
                  className="rounded-card border border-line bg-white p-4 shadow-soft sm:p-5"
                >
                  <p className="mb-3.5 flex items-center gap-2 font-display text-sm font-bold text-navy-900">
                    <span className="tnum flex h-6 w-6 items-center justify-center rounded-full bg-navy-900/[0.06] text-xs">
                      {i + 1}
                    </span>
                    Ticket {i + 1}
                    <span className="eyebrow rounded-full bg-brand-50 px-2 py-1 text-brand-700">{slot.ticketTypeName}</span>
                  </p>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">First name *</Label>
                      <Input
                        value={syncedAttendees[i]?.firstName ?? ''}
                        onChange={(e) => updateAttendee(i, 'firstName', e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Last name *</Label>
                      <Input
                        value={syncedAttendees[i]?.lastName ?? ''}
                        onChange={(e) => updateAttendee(i, 'lastName', e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">National ID *</Label>
                      <Input
                        value={syncedAttendees[i]?.nationalId ?? ''}
                        onChange={(e) => updateAttendee(i, 'nationalId', e.target.value)}
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email address *</Label>
                      <Input
                        type="email"
                        value={syncedAttendees[i]?.email ?? ''}
                        onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Phone number *</Label>
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
            </>
          )}

          {step === 'confirm' && (
            <>
              <header>
                <p className="eyebrow text-brand-700">Step {needsAttendees ? 3 : 2}</p>
                <h2 className="mt-1.5 font-display text-xl font-bold text-navy-900">Confirm your M-Pesa number</h2>
                <p className="mt-1 text-sm text-muted">
                  This reserves your tickets against the number below. On the next screen you&apos;ll type it once more to
                  release the STK push — no money moves until then.
                </p>
              </header>

              <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Smartphone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="cart-phone">M-Pesa phone number *</Label>
                    <Input
                      id="cart-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="07XXXXXXXX or 01XXXXXXXX"
                    />
                    <p className="mt-2 text-xs text-muted">
                      Use the number that will approve the payment. You can still change it before the push is sent.
                    </p>
                  </div>
                </div>

                <ol className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px] text-navy-700">
                  <FlowNote index={1} text="We confirm this number and reserve your tickets." />
                  <FlowNote index={2} text="You re-enter it on the payment screen to send the STK push." />
                  <FlowNote index={3} text="Approve with your M-Pesa PIN and your QR tickets are issued instantly." />
                </ol>
              </div>

              {!user && (
                <p className="rounded-card border border-line bg-white p-4 text-sm text-muted">
                  <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                    Log in
                  </Link>{' '}
                  to confirm — your selected tickets stay in the cart.
                </p>
              )}
            </>
          )}

          {/* Step navigation */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {step !== 'tickets' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'confirm' && needsAttendees ? 'attendees' : 'tickets')}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            )}

            {step === 'tickets' && (
              <Button variant="primary" size="lg" onClick={goToNextFromTickets} disabled={totalItems <= 0}>
                {totalItems > 0 ? `Continue with ${totalItems} ticket${totalItems === 1 ? '' : 's'}` : 'Select a tier'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {step === 'attendees' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  if (validateAttendees()) setStep('confirm');
                }}
              >
                Continue to M-Pesa number
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {step === 'confirm' && (
              <Button variant="primary" size="lg" onClick={handleConfirmNumber} loading={placing}>
                {placing ? 'Confirming…' : `Confirm number & reserve ${formatCurrency(finalTotal)}`}
              </Button>
            )}
          </div>
        </div>

        {/* ── Order summary ────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-bold text-navy-900">Order summary</h2>
              <p className="mt-0.5 text-xs text-muted">
                {totalItems > 0 ? `${totalItems} ticket${totalItems === 1 ? '' : 's'} selected` : 'No tickets selected yet'}
              </p>
            </div>

            <div className="space-y-3 px-5 py-4">
              {eventItems.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <TicketIcon className="h-4 w-4" aria-hidden="true" />
                  Pick a tier to see your total.
                </p>
              ) : (
                eventItems.map((item) => (
                  <div key={item.ticketTypeId} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-900">{item.ticketTypeName}</p>
                      <p className="tnum text-xs text-muted">
                        {tierLabel(item.ticketTypeCategory)} · {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <span className="tnum shrink-0 font-semibold text-navy-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between text-navy-600">
                <span>Ticket subtotal</span>
                <span className="tnum">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-navy-600">
                <span className="flex items-center gap-1.5">
                  Service fee
                  <span className="tnum rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                    {SERVICE_FEE_PERCENT}%
                  </span>
                </span>
                <span className="tnum">{formatCurrency(serviceFee)}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                The {SERVICE_FEE_PERCENT}% platform commission covers secure M-Pesa processing and instant QR ticket
                delivery. The organizer receives the full face value.
              </p>
            </div>

            <div className="flex items-baseline justify-between border-t border-line px-5 py-4">
              <span className="font-semibold text-navy-900">Total to pay</span>
              <span className="tnum font-display text-2xl font-extrabold text-navy-900">{formatCurrency(finalTotal)}</span>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-line bg-cream/60 px-5 py-4 text-[11px] text-muted">
              <span className="flex items-center gap-2">
                <Image
                  src="/mpesa-logo.svg"
                  alt=""
                  width={512}
                  height={273}
                  unoptimized
                  className="h-4 w-auto"
                  aria-hidden="true"
                />
                Paid by M-Pesa STK Push on the next screen
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Checkout stays on ticketflow.co.ke
              </span>
              {needsAttendees && (
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  Named ticket holders required for {ATTENDEE_THRESHOLD}+ tickets
                </span>
              )}
              <span className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Your number is only used for this payment
              </span>
            </div>
          </div>
        </aside>
      </Container>
    </main>
  );
}

function FlowNote({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="tnum mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900/[0.06] text-[11px] font-bold text-navy-700">
        {index}
      </span>
      {text}
    </li>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <Container className="max-w-3xl py-20">
          <p className="text-muted">Loading your booking…</p>
        </Container>
      }
    >
      <BookingFlow />
    </Suspense>
  );
}
