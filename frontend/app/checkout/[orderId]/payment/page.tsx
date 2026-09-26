'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';
import { formatCurrency } from '@/lib/format';
import { Order, Payment, PaymentStatusView } from '@/types';
import {
  copyFor,
  flowStateFor,
  isFinalFlowState,
  payPhoneKey,
  PaymentFlowState,
  POLL_CEILING_MS,
  POLL_INTERVAL_MS,
  retryLabelFor,
  STK_SENT_HOLD_MS,
} from '@/lib/payment-flow';

/** How long the success card is shown before handing over to the ticket confirmation. */
const SUCCESS_HANDOFF_MS = 2_500;

function PaymentProcessing() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  /** When this browser saw the prompt accepted — separates "check your phone" from "waiting". */
  const [stkSentAt, setStkSentAt] = useState<number | null>(null);
  /** Set by a timer, not read off the clock at render: see flowStateFor(). */
  const [stkHoldElapsed, setStkHoldElapsed] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const [pollCeilingHit, setPollCeilingHit] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  /** An STK request is on its way to the backend right now. */
  const [sending, setSending] = useState(false);

  /** The push is fired exactly once per mount, whatever React does with effects. */
  const startedRef = useRef(false);

  // Already cached by the checkout page, so arriving here shows the amount with
  // no loading flash.
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${orderId}`);
      return data as Order;
    },
  });

  /**
   * Sends the prompt and owns its own in-flight flag.
   *
   * Deliberately not a useMutation: this fires from an effect on mount, and a
   * mutation observer torn down and rebuilt around that call (React StrictMode
   * does exactly this in dev) reports `pending` forever — which would leave the
   * Try Again button permanently disabled. A plain request with explicit state
   * behaves the same in development and production.
   */
  const sendStkPush = useCallback(
    async (msisdn: string) => {
      setSending(true);
      setInitError(null);
      setPollCeilingHit(false);
      setStkHoldElapsed(false);
      setAttemptStartedAt(Date.now());
      try {
        const { data } = await api.post('/payments/mpesa/stk-push', { orderId, phone: msisdn });
        const next = data as PaymentStatusView;
        setPaymentId(next.paymentId);
        // Seed the cache so the screen moves to "check your phone" without
        // waiting out a full poll interval.
        queryClient.setQueryData(['payment-status', next.paymentId], next);
        if (next.checkoutRequestId) setStkSentAt(Date.now());
      } catch (error) {
        setInitError(getApiErrorMessage(error));
      } finally {
        setSending(false);
      }
    },
    [orderId, queryClient],
  );

  const { data: status } = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${paymentId}/status`);
      return data as PaymentStatusView;
    },
    enabled: Boolean(paymentId) && !pollCeilingHit,
    // Stop the moment the transaction is final — no infinite polling.
    refetchInterval: (query) => (query.state.data?.isFinal ? false : POLL_INTERVAL_MS),
  });

  /* ── Boot: send the prompt, or adopt one already in flight ──────────────── */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const stored = window.sessionStorage.getItem(payPhoneKey(orderId));
    if (stored) {
      setPhone(stored);
      void sendStkPush(stored);
      return;
    }

    // Opened without going through checkout (a restored tab, a shared link).
    // Adopt whatever payment exists rather than pushing a fresh prompt.
    api
      .get(`/payments/order/${orderId}`)
      .then(({ data }) => {
        const latest = (data as Payment[])[0];
        if (!latest) {
          router.replace(`/checkout/${orderId}`);
          return;
        }
        setPaymentId(latest.id);
        // The prompt was sent before this tab existed, so skip the
        // "check your phone" hold and go straight to waiting.
        if (latest.checkoutRequestId) setStkSentAt(Date.now() - STK_SENT_HOLD_MS);
      })
      .catch(() => router.replace(`/checkout/${orderId}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  /* ── A push accepted mid-poll still needs its "check your phone" moment ── */
  useEffect(() => {
    if (status?.checkoutRequestId && stkSentAt === null) setStkSentAt(Date.now());
  }, [status?.checkoutRequestId, stkSentAt]);

  /* ── …and that moment ends on a timer, not on the next re-render ───────── */
  useEffect(() => {
    if (stkSentAt === null) return;
    const remaining = STK_SENT_HOLD_MS - (Date.now() - stkSentAt);
    if (remaining <= 0) {
      setStkHoldElapsed(true);
      return;
    }
    const timer = setTimeout(() => setStkHoldElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [stkSentAt]);

  /* ── Client-side ceiling, so an unreachable backend is not a dead end ──── */
  useEffect(() => {
    if (!paymentId || status?.isFinal) return;
    const remaining = POLL_CEILING_MS - (Date.now() - attemptStartedAt);
    if (remaining <= 0) {
      setPollCeilingHit(true);
      return;
    }
    const timer = setTimeout(() => setPollCeilingHit(true), remaining);
    return () => clearTimeout(timer);
  }, [paymentId, status?.isFinal, attemptStartedAt]);

  /* ── Success hands over to the existing ticket confirmation ─────────────── */
  useEffect(() => {
    if (status?.stage !== 'SUCCESS') return;
    window.sessionStorage.removeItem(payPhoneKey(orderId));
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['order-tickets', orderId] });
    const timer = setTimeout(() => router.replace(`/checkout/${orderId}`), SUCCESS_HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [status?.stage, orderId, queryClient, router]);

  /* ── Resolve the one state the screen renders ───────────────────────────── */
  const backendState = flowStateFor(status, { stkHoldElapsed });
  let state: PaymentFlowState;
  if (initError) {
    state = 'FAILED';
  } else if (status?.isFinal) {
    state = backendState;
  } else if (pollCeilingHit) {
    state = 'TIMEOUT';
  } else {
    state = sending && !status ? 'INITIALIZING' : backendState;
  }

  const amount = formatCurrency(status?.amount ?? order?.totalAmount ?? 0);
  const copy = copyFor(state, { amount, phoneMasked: status?.phoneMasked });
  const isFinal = isFinalFlowState(state);
  const retryLabel = retryLabelFor(state);

  // Safaricom's own wording is more specific than our generic copy ("wrong PIN",
  // "insufficient balance"), so show it when the payment failed for a reason.
  const detail =
    initError ?? (state === 'FAILED' || state === 'TIMEOUT' ? status?.resultDesc ?? null : null);

  const handleRetry = () => {
    if (!phone) {
      // The number never reached this tab, so send the buyer back to confirm it
      // rather than guessing which handset to ring.
      router.push(`/checkout/${orderId}`);
      return;
    }
    void sendStkPush(phone);
  };

  return (
    // Fills the fold below the navbar without adding a viewport of dead ground
    // underneath the card.
    <main className="bg-cream min-h-[calc(100vh-var(--header-height))] py-10 sm:py-14">
      <Container className="max-w-lg">
        <div className="mb-6 flex justify-center">
          <Logo theme="light" className="h-10" />
        </div>

        <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
          {/* Amount and method — the two facts the buyer checks before paying. */}
          <div className="border-b border-line pb-5 text-center">
            <p className="eyebrow text-muted">Amount to pay</p>
            <p className="tnum mt-2 text-[32px] font-extrabold leading-none text-navy-900 sm:text-[38px]">
              {amount}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-cream/70 px-3 py-1.5">
              <span className="text-[12px] font-semibold text-navy-700">Paying with</span>
              <Image
                src="/mpesa-logo.svg"
                alt="M-PESA"
                width={512}
                height={273}
                unoptimized
                className="h-5 w-auto"
              />
            </span>
            {order && <p className="tnum mt-3 text-[11px] text-muted">Order {order.orderNumber}</p>}
          </div>

          {/* Status */}
          <div className="pt-6 text-center">
            <StatusIcon state={state} />

            <h1 className="mt-4 text-[22px] font-extrabold leading-tight text-navy-900 sm:text-[26px]">
              {copy.heading}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{detail ?? copy.body}</p>

            {status?.phoneMasked && (state === 'STK_SENT' || state === 'WAITING_FOR_CONFIRMATION') && (
              <p className="tnum mt-4 inline-block rounded-btn border border-line bg-cream/70 px-4 py-2 text-lg font-bold text-navy-900">
                {status.phoneMasked}
              </p>
            )}

            {copy.hint && !isFinal && <p className="mt-3 text-[13px] text-muted">{copy.hint}</p>}

            {state === 'WAITING_FOR_CONFIRMATION' && (
              <p className="mt-5 flex items-center justify-center gap-2 text-[13px] font-semibold text-navy-900">
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
                  aria-hidden="true"
                />
                Waiting for M-Pesa confirmation…
              </p>
            )}

            {state === 'SUCCESS' && status?.mpesaReceiptNumber && (
              <p className="tnum mt-3 font-mono text-xs text-muted">
                M-Pesa receipt {status.mpesaReceiptNumber}
              </p>
            )}

            {/* One live region carries the state change to screen readers. */}
            <p aria-live="polite" className="sr-only">
              {copy.heading}. {detail ?? copy.body}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-7 space-y-3">
            {state === 'SUCCESS' && (
              <>
                <Link href={`/checkout/${orderId}`} className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    View my ticket{(order?.items?.length ?? 1) > 1 ? 's' : ''}
                  </Button>
                </Link>
                <p className="text-center text-[12px] text-muted">
                  Taking you to your ticket{(order?.items?.length ?? 1) > 1 ? 's' : ''}…
                </p>
              </>
            )}

            {retryLabel && (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={sending}
                  onClick={handleRetry}
                >
                  {retryLabel}
                </Button>
                <Link href={`/checkout/${orderId}`} className="block">
                  <Button variant="outline" size="md" fullWidth>
                    Back to checkout
                  </Button>
                </Link>
              </>
            )}

            {!isFinal && (
              <p className="rounded-btn border border-accent-200 bg-accent-50 px-4 py-3 text-center text-[13px] font-medium text-accent-800">
                Please do not close or refresh this page while the payment is being processed.
              </p>
            )}
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[12px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Confirmed by Safaricom directly — TicketFlow never sees your M-Pesa PIN.
          </p>
        </div>
      </Container>
    </main>
  );
}

function StatusIcon({ state }: { state: PaymentFlowState }) {
  if (state === 'SUCCESS') {
    return (
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
      </span>
    );
  }

  if (state === 'TIMEOUT') {
    return (
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-50">
        <Clock className="h-8 w-8 text-accent-600" aria-hidden="true" />
      </span>
    );
  }

  if (state === 'CANCELLED' || state === 'FAILED') {
    return (
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-50">
        <XCircle className="h-8 w-8 text-danger-600" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className="inline-block h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"
      aria-hidden="true"
    />
  );
}

export default function PaymentProcessingPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <PaymentProcessing />
    </RequireRole>
  );
}
