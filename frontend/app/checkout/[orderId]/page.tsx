'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Mail,
  PartyPopper,
  ShieldCheck,
  Smartphone,
  Ticket as TicketIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import { Order, Ticket } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { SERVICE_FEE_PERCENT } from '@/lib/fees';
import {
  isValidKenyanPhone,
  KENYA_PHONE_MESSAGE,
  maskKenyanPhone,
  normalizeKenyanPhone,
} from '@/lib/phone';
import { tierLabel } from '@/lib/tiers';
import { payPhoneKey } from '@/lib/payment-flow';
import Container from '@/components/ui/Container';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BookingSteps from '@/components/BookingSteps';

function CheckoutContent() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  // Set from the moment Pay is pressed until the route change lands, so the
  // button cannot be pressed twice into two STK pushes.
  const [handingOff, setHandingOff] = useState(false);

  const { data: order } = useQuery({
    queryKey: ['order', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${params.orderId}`);
      return data as Order;
    },
  });

  const { data: tickets } = useQuery({
    queryKey: ['order-tickets', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${params.orderId}`);
      return (data as Order).tickets ?? [];
    },
    enabled: order?.status === 'PAID',
    refetchInterval: (query) => {
      const t = query.state.data as Ticket[] | undefined;
      return !t || t.length === 0 ? 2000 : false;
    },
  });

  /**
   * Pressing Pay hands the buyer straight to the payment-processing screen,
   * which is what actually fires the STK push. The number travels in
   * sessionStorage rather than the URL so it is never written into browser
   * history, a referrer header or a shared link.
   */
  const startPayment = () => {
    if (!isValidKenyanPhone(phone)) {
      toast.error(KENYA_PHONE_MESSAGE);
      return;
    }
    setHandingOff(true);
    try {
      window.sessionStorage.setItem(payPhoneKey(params.orderId), phone.trim());
    } catch {
      // Private-browsing modes can refuse sessionStorage; the processing screen
      // falls back to adopting an in-flight payment.
    }
    router.push(`/checkout/${params.orderId}/payment`);
  };

  if (!order) {
    return (
      <Container className="max-w-2xl py-16">
        <p className="text-muted">Loading order…</p>
      </Container>
    );
  }

  /* ── SUCCESS SCREEN ──────────────────────────────────────────────────── */
  if (order.status === 'PAID') {
    const paidTickets = tickets ?? [];

    return (
      <main className="pb-16">
        <section className="booking-heading">
          <Container className="py-12 text-center sm:py-16">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20">
              <PartyPopper className="h-7 w-7 text-brand-300" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-[28px] font-extrabold sm:text-4xl">
              Payment <span className="text-brand-600">confirmed</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
              Thank you for buying with TicketFlow Kenya. Your ticket
              {paidTickets.length === 1 ? ' has' : 's have'} been issued and sent to your email.
            </p>
            <p className="tnum mt-4 text-xs text-muted">Order {order.orderNumber}</p>
          </Container>
        </section>

        <Container className="max-w-3xl py-8 sm:py-10">
          <div className="rounded-card border border-line bg-white p-5 text-sm leading-relaxed text-navy-700 shadow-card sm:p-6">
            <p className="text-base font-bold text-navy-900">{order.event.title}</p>
            <p className="mt-1 text-muted">
              {formatDateTime(order.event.startDateTime)} · {order.event.venue}, {order.event.city}
            </p>
            <p className="mt-4">
              A PDF ticket has been generated for each ticket you purchased and sent to your registered email address.
              Present your QR code at the entrance for verification — each ticket is valid for{' '}
              <strong>one entry only</strong>, so do not share it publicly.
            </p>
          </div>

          {paidTickets.length > 0 ? (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-bold text-navy-900">
                Your {paidTickets.length > 1 ? `${paidTickets.length} tickets` : 'ticket'}
              </h2>
              {paidTickets.map((ticket) => (
                <div key={ticket.id} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-3">
                    <span className="eyebrow text-brand-700">
                      {ticket.ticketType?.name} · {tierLabel(ticket.ticketType?.category ?? '')}
                    </span>
                    <span className="tnum font-mono text-xs text-navy-600">{ticket.ticketCode}</span>
                  </div>

                  <div className="flex flex-col gap-5 p-5 sm:flex-row">
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <div className="rounded-btn border border-line bg-white p-2">
                        <Image src={ticket.qrCodeData} alt="Ticket QR code" width={160} height={160} unoptimized />
                      </div>
                      <p className="tnum font-mono text-xs text-muted">{ticket.ticketCode}</p>
                    </div>

                    <div className="flex-1 space-y-2 text-sm">
                      <Row label="Event" value={order.event.title} />
                      <Row
                        label="Tier"
                        value={`${ticket.ticketType?.name} (${tierLabel(ticket.ticketType?.category ?? '')})`}
                      />
                      <Row label="Face value" value={formatCurrency(ticket.ticketType?.price ?? 0)} />
                      <Row label="Venue" value={`${order.event.venue}, ${order.event.city}`} />
                      <Row label="Date" value={formatDateTime(order.event.startDateTime)} />
                      <Row
                        label="Payment"
                        value="Confirmed"
                        icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />}
                      />

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link href={`/tickets/${ticket.id}`}>
                          <Button variant="primary" size="sm">
                            View e-ticket
                          </Button>
                        </Link>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticket.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Download PDF
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-card border border-line bg-white p-6 text-center text-sm text-muted">
              <p>Generating your ticket{order.items.length > 1 ? 's' : ''}…</p>
              <div className="mx-auto mt-3 h-2 w-32 animate-pulse rounded-full bg-navy-900/10" />
            </div>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Your PDF ticket has also been sent to your registered email address.
          </p>

          <div className="mt-6 flex justify-center">
            <Link href="/dashboard/tickets">
              <Button variant="secondary">View all my tickets</Button>
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  /* ── PAYMENT SCREEN — the second entry of the number ─────────────────── */
  const confirmedPhone = order.customerPhone ?? '';
  const mismatch =
    Boolean(confirmedPhone) &&
    isValidKenyanPhone(phone) &&
    normalizeKenyanPhone(phone) !== normalizeKenyanPhone(confirmedPhone);
  // Attendee details were collected for 2+ tickets, not 2+ tier lines.
  const ticketCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="pb-16">
      <section className="booking-heading">
        <Container className="py-7 sm:py-9">
          <p className="eyebrow text-brand-700">Final step</p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight sm:text-[32px]">
            Re-enter your number to <span className="text-brand-600">send the STK push</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-muted">
            {confirmedPhone
              ? `You reserved these tickets against ${maskKenyanPhone(confirmedPhone)}. Type it once more to release the payment prompt.`
              : 'Type the M-Pesa number that will approve this payment.'}
          </p>

          <BookingSteps current="pay" showAttendees={ticketCount > 1} className="mt-7 max-w-2xl" />
        </Container>
      </section>

      <Container className="grid max-w-5xl gap-8 py-8 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:py-10">
        {/* Payment panel */}
        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Label htmlFor="checkout-phone">Confirm M-Pesa phone number *</Label>
              <Input
                id="checkout-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX or 01XXXXXXXX"
                disabled={handingOff}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') startPayment();
                }}
              />
              <p className="mt-2 text-xs text-muted">
                Entering it a second time makes sure the prompt reaches the right handset.
              </p>
            </div>
          </div>

          {mismatch && (
            <p className="mt-4 flex items-start gap-2.5 rounded-btn border border-accent-200 bg-accent-50 p-3.5 text-[13px] text-accent-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                This is a different number from the one you confirmed ({maskKenyanPhone(confirmedPhone)}). The push will
                go to the number typed above — check it before continuing.
              </span>
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-5"
            loading={handingOff}
            disabled={!phone || handingOff}
            onClick={startPayment}
          >
            {handingOff ? (
              'Opening secure payment…'
            ) : (
              <span className="flex items-center justify-center gap-2">
                Pay {formatCurrency(order.totalAmount)} with
                <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
              </span>
            )}
          </Button>

          <ul className="mt-5 space-y-2 border-t border-line pt-4 text-[12px] text-muted">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Payment is confirmed by Safaricom directly — TicketFlow never sees your PIN.
            </li>
            <li className="flex items-center gap-2">
              <TicketIcon className="h-3.5 w-3.5" aria-hidden="true" />
              QR tickets are issued the instant the callback lands.
            </li>
          </ul>
        </div>

        {/* Order recap */}
        <aside className="rounded-card border border-line bg-white shadow-card lg:sticky lg:top-28">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-bold text-navy-900">{order.event.title}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(order.event.startDateTime)} · {order.event.venue}
            </p>
            <p className="tnum mt-2 text-[11px] text-muted">Order {order.orderNumber}</p>
          </div>

          <div className="space-y-3 px-5 py-4 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-900">{item.ticketType.name}</p>
                  <p className="tnum text-xs text-muted">
                    {tierLabel(item.ticketType.category)} · {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span className="tnum shrink-0 font-semibold text-navy-900">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between text-navy-600">
              <span className="flex items-center gap-1.5">
                Service fee
                <span className="tnum rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                  {SERVICE_FEE_PERCENT}%
                </span>
              </span>
              <span className="tnum">{formatCurrency(order.platformFee)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between border-t border-line px-5 py-4">
            <span className="font-semibold text-navy-900">Total to pay</span>
            <span className="tnum text-2xl font-extrabold text-navy-900">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </aside>
      </Container>
    </main>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium text-navy-900">
        {icon}
        {value}
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <CheckoutContent />
    </RequireRole>
  );
}
