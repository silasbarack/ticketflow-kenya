'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CheckCircle2, Download, Mail, PartyPopper } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import { Order, Payment, Ticket } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';
import Container from '@/components/ui/Container';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

function CheckoutContent() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const { data: order } = useQuery({
    queryKey: ['order', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${params.orderId}`);
      return data as Order;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['order-payments', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/order/${params.orderId}`);
      return data as Payment[];
    },
    enabled: !!activePaymentId,
    refetchInterval: (query) => {
      const latest = query.state.data?.[0];
      return latest && latest.status !== 'PENDING' ? false : 3000;
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

  const latestPayment = payments?.[0];

  if (latestPayment?.status === 'SUCCESS') {
    queryClient.invalidateQueries({ queryKey: ['order', params.orderId] });
  }

  const stkPush = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/mpesa/stk-push', { orderId: params.orderId, phone });
      return data as Payment;
    },
    onSuccess: (payment) => {
      setActivePaymentId(payment.id);
      toast.success('Check your phone for the M-Pesa PIN prompt.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const mockSuccess = useMutation({
    mutationFn: async () => {
      if (!activePaymentId) throw new Error('No active payment yet');
      const { data } = await api.post(`/payments/mock/${activePaymentId}/success`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', params.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-tickets', params.orderId] });
      toast.success('Payment confirmed!');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!order) {
    return (
      <Container className="max-w-2xl py-16">
        <p className="text-muted">Loading order...</p>
      </Container>
    );
  }

  /* ── SUCCESS SCREEN ──────────────────────────────────────────────────── */
  if (order.status === 'PAID') {
    const paidTickets = tickets ?? [];

    return (
      <Container className="max-w-2xl py-10">
        {/* Thank-you banner */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-8 text-center">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-brand-600" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-brand-800">Payment Confirmed!</h1>
          <p className="mt-2 text-base text-brand-700">
            Thank you for purchasing with <strong>TicketFlow Kenya</strong>.
          </p>
          <p className="mt-1 text-sm text-brand-600">
            Your ticket{paidTickets.length > 1 ? 's have' : ' has'} been generated and
            {paidTickets.length > 0 ? ' are' : ' will be'} sent to your email.
          </p>
        </div>

        {/* Appreciation message */}
        <div className="mt-6 space-y-2 rounded-2xl border border-line bg-white px-6 py-5 text-sm text-navy-700">
          <p className="text-base font-semibold text-navy-900">Dear {order.event.title} attendee,</p>
          <p>
            Your payment has been successfully confirmed. A PDF ticket has been generated for
            each ticket you purchased and sent to your registered email address.
          </p>
          <p>
            Please present your QR code at the event entrance for verification. Each ticket is
            valid for <strong>one entry only</strong> — do not share your QR code publicly.
          </p>
          <p className="pt-1 text-xs text-muted">
            We appreciate your purchase and look forward to seeing you at the event. —{' '}
            <em>TicketFlow Kenya</em>
          </p>
        </div>

        {/* Per-ticket cards */}
        {paidTickets.length > 0 ? (
          <div className="mt-6 space-y-4">
            <h2 className="font-semibold text-navy-900">
              Your {paidTickets.length > 1 ? `${paidTickets.length} tickets` : 'ticket'}
            </h2>
            {paidTickets.map((ticket) => (
              <div key={ticket.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                {/* Ticket header */}
                <div className="flex items-center justify-between bg-navy-900 px-5 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                    {ticket.ticketType?.name} &middot; {formatTicketCategory(ticket.ticketType?.category ?? '')}
                  </span>
                  <span className="font-mono text-xs text-white">{ticket.ticketCode}</span>
                </div>

                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  {/* QR code */}
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="rounded-xl border border-line bg-white p-2">
                      <Image src={ticket.qrCodeData} alt="Ticket QR code" width={160} height={160} unoptimized />
                    </div>
                    <p className="font-mono text-xs text-muted">{ticket.ticketCode}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2 text-sm">
                    <Row label="Event" value={order.event.title} />
                    <Row
                      label="Type"
                      value={`${ticket.ticketType?.name} (${formatTicketCategory(ticket.ticketType?.category ?? '')})`}
                    />
                    <Row label="Price" value={formatCurrency(ticket.ticketType?.price ?? 0)} />
                    <Row label="Venue" value={`${order.event.venue}, ${order.event.city}`} />
                    <Row label="Date" value={formatDateTime(order.event.startDateTime)} />
                    <Row label="Payment" value="Confirmed" icon={<CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />} />

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="primary" size="sm">
                          View e-ticket
                        </Button>
                      </Link>
                      <a href={`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticket.id}/pdf`} target="_blank" rel="noopener noreferrer">
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
          <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
            <p>Generating your ticket{order.items.length > 1 ? 's' : ''}…</p>
            <div className="mx-auto mt-3 h-2 w-32 animate-pulse rounded-full bg-navy-900/10" />
          </div>
        )}

        {/* Email notice */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Your PDF ticket has also been sent to your registered email address.
        </p>

        <div className="mt-6 flex justify-center">
          <Link href="/dashboard/tickets">
            <Button variant="secondary">View all my tickets &rarr;</Button>
          </Link>
        </div>
      </Container>
    );
  }

  /* ── PAYMENT FORM ──────────────────────────────────────────────────────── */
  return (
    <Container className="max-w-2xl py-10">
      <h1 className="text-2xl font-bold text-navy-900">Complete your payment</h1>
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h2 className="font-semibold text-navy-900">{order.event.title}</h2>
        <ul className="mt-3 space-y-1 text-sm text-navy-600">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity} &times; {item.ticketType.name}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm text-navy-600">
          <span>Service fee</span>
          <span>{formatCurrency(order.platformFee)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold text-navy-900">
          <span>Total to pay</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="mt-6">
          <Label htmlFor="checkout-phone">M-Pesa phone number</Label>
          <Input id="checkout-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX or 01XXXXXXXX" />
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="mt-4"
          loading={stkPush.isPending}
          disabled={!phone || !!activePaymentId}
          onClick={() => {
            if (!isValidKenyanPhone(phone)) {
              toast.error(KENYA_PHONE_MESSAGE);
              return;
            }
            stkPush.mutate();
          }}
        >
          {stkPush.isPending ? (
            'Sending STK push…'
          ) : (
            <span className="flex items-center justify-center gap-2">
              Pay with
              <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
            </span>
          )}
        </Button>

        {activePaymentId && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <p>
              Status: <strong>{latestPayment?.status || 'PENDING'}</strong> — waiting for confirmation from Safaricom.
            </p>
            <button
              onClick={() => mockSuccess.mutate()}
              disabled={mockSuccess.isPending}
              className="mt-2 rounded-btn border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Dev only: simulate successful callback
            </button>
          </div>
        )}
      </div>
    </Container>
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
