'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import { Order, Payment, Ticket } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';

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
    return <main className="mx-auto max-w-2xl px-4 py-16 text-gray-500">Loading order...</main>;
  }

  /* ── SUCCESS SCREEN ──────────────────────────────────────────────────── */
  if (order.status === 'PAID') {
    const paidTickets = tickets ?? [];

    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Thank-you banner */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-emerald-800">Payment Confirmed!</h1>
          <p className="mt-2 text-emerald-700 text-base">
            Thank you for purchasing with <strong>TicketFlow Kenya</strong>.
          </p>
          <p className="mt-1 text-sm text-emerald-600">
            Your ticket{paidTickets.length > 1 ? 's have' : ' has'} been generated and
            {paidTickets.length > 0 ? ' are' : ' will be'} sent to your email.
          </p>
        </div>

        {/* Appreciation message */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-700 space-y-2">
          <p className="font-semibold text-gray-900 text-base">
            Dear {order.event.title} attendee,
          </p>
          <p>
            Your payment has been successfully confirmed. A PDF ticket has been generated for
            each ticket you purchased and sent to your registered email address.
          </p>
          <p>
            Please present your QR code at the event entrance for verification. Each ticket is
            valid for <strong>one entry only</strong> — do not share your QR code publicly.
          </p>
          <p className="text-gray-500 text-xs pt-1">
            We appreciate your purchase and look forward to seeing you at the event.
            — <em>TicketFlow Kenya</em>
          </p>
        </div>

        {/* Per-ticket cards */}
        {paidTickets.length > 0 ? (
          <div className="mt-6 space-y-4">
            <h2 className="font-semibold text-gray-900">
              Your {paidTickets.length > 1 ? `${paidTickets.length} tickets` : 'ticket'}
            </h2>
            {paidTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
              >
                {/* Ticket header */}
                <div className="bg-brand-600 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-100 uppercase tracking-wide">
                    {ticket.ticketType?.name} · {formatTicketCategory(ticket.ticketType?.category ?? '')}
                  </span>
                  <span className="text-xs font-mono text-white">{ticket.ticketCode}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 p-5">
                  {/* QR code */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="rounded-xl border border-gray-200 p-2 bg-white">
                      <Image
                        src={ticket.qrCodeData}
                        alt="Ticket QR code"
                        width={160}
                        height={160}
                        unoptimized
                      />
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{ticket.ticketCode}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2 text-sm">
                    <Row label="Event" value={order.event.title} />
                    <Row label="Type" value={`${ticket.ticketType?.name} (${formatTicketCategory(ticket.ticketType?.category ?? '')})`} />
                    <Row label="Price" value={formatCurrency(ticket.ticketType?.price ?? 0)} />
                    <Row label="Venue" value={`${order.event.venue}, ${order.event.city}`} />
                    <Row label="Date" value={formatDateTime(order.event.startDateTime)} />
                    <Row label="Payment" value="Confirmed ✓" />

                    <div className="pt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        View e-ticket
                      </Link>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticket.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        ⬇ Download PDF
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            <p>Generating your ticket{order.items.length > 1 ? 's' : ''}…</p>
            <div className="mt-3 h-2 w-32 mx-auto rounded-full bg-gray-200 animate-pulse" />
          </div>
        )}

        {/* Email notice */}
        <p className="mt-4 text-center text-sm text-gray-400">
          📧 Your PDF ticket has also been sent to your registered email address.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/tickets"
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            View all my tickets →
          </Link>
        </div>
      </main>
    );
  }

  /* ── PAYMENT FORM ──────────────────────────────────────────────────────── */
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Complete your payment</h1>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">{order.event.title}</h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity} × {item.ticketType.name}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">M-Pesa phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX or 01XXXXXXXX"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={() => {
            if (!isValidKenyanPhone(phone)) {
              toast.error(KENYA_PHONE_MESSAGE);
              return;
            }
            stkPush.mutate();
          }}
          disabled={stkPush.isPending || !phone || !!activePaymentId}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {stkPush.isPending ? (
            'Sending STK push…'
          ) : (
            <span className="flex items-center justify-center gap-2">
              Pay with
              <span className="rounded bg-white px-1.5 py-0.5">
                <Image
                  src="/mpesa-logo.svg"
                  alt="M-PESA"
                  width={512}
                  height={273}
                  unoptimized
                  className="h-5 w-auto"
                />
              </span>
            </span>
          )}
        </button>

        {activePaymentId && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <p>
              Status: <strong>{latestPayment?.status || 'PENDING'}</strong> — waiting for
              confirmation from Safaricom.
            </p>
            <button
              onClick={() => mockSuccess.mutate()}
              disabled={mockSuccess.isPending}
              className="mt-2 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Dev only: simulate successful callback
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
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
