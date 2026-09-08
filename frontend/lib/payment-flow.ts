import { PaymentStatusView } from '@/types';

/**
 * The states the payment-processing screen can be in.
 *
 * Deliberately explicit rather than a single `isLoading` boolean: "the prompt
 * is on your phone" and "we are verifying what you entered" are different
 * moments for the buyer, and conflating them is how a screen ends up claiming
 * a payment succeeded while it is still pending.
 */
export type PaymentFlowState =
  | 'INITIALIZING'
  | 'STK_SENT'
  | 'WAITING_FOR_CONFIRMATION'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'FAILED'
  | 'TIMEOUT';

/** Polling stops here — nothing can move a payment out of these. */
export const FINAL_FLOW_STATES: PaymentFlowState[] = ['SUCCESS', 'CANCELLED', 'FAILED', 'TIMEOUT'];

export function isFinalFlowState(state: PaymentFlowState): boolean {
  return FINAL_FLOW_STATES.includes(state);
}

/**
 * How long "Check your phone" stays the headline before the screen settles into
 * "waiting for confirmation". Long enough for the buyer to actually look at
 * their handset.
 */
export const STK_SENT_HOLD_MS = 6_000;

/**
 * Client-side ceiling on how long we keep polling. The backend expires an
 * unanswered prompt on its own, but if it is unreachable — or Safaricom never
 * answers a status query — the buyer must still be given a way out instead of
 * an endless spinner.
 */
export const POLL_CEILING_MS = 4 * 60 * 1000;

/** How often the status endpoint is polled while the payment is in flight. */
export const POLL_INTERVAL_MS = 3_000;

/**
 * Projects the backend's payment stage onto the screen's state.
 *
 * `stkHoldElapsed` splits AWAITING_CUSTOMER into its two beats: the moment the
 * prompt lands, and the wait that follows. It is a flag rather than a timestamp
 * compared against `Date.now()` because React does not re-render on clock ticks
 * — and while the buyer waits, every poll returns an identical body, so the
 * screen would sit on "check your phone" forever. The caller owns the timer.
 */
export function flowStateFor(
  status: PaymentStatusView | undefined,
  { stkHoldElapsed = false }: { stkHoldElapsed?: boolean } = {},
): PaymentFlowState {
  if (!status) return 'INITIALIZING';

  switch (status.stage) {
    case 'SUCCESS':
      return 'SUCCESS';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'FAILED':
      return 'FAILED';
    case 'EXPIRED':
      return 'TIMEOUT';
    case 'VERIFYING':
      return 'VERIFYING';
    case 'AWAITING_CUSTOMER':
      return stkHoldElapsed ? 'WAITING_FOR_CONFIRMATION' : 'STK_SENT';
    default:
      return 'INITIALIZING';
  }
}

export interface FlowCopy {
  heading: string;
  body: string;
  /** Shown under the body while the buyer still has something to do. */
  hint?: string;
}

/**
 * Buyer-facing copy per state. The backend sends its own `message`; this is the
 * screen's voice, kept here so every state reads consistently and no state can
 * silently fall through to a generic string.
 */
export function copyFor(state: PaymentFlowState, ctx: { amount: string; phoneMasked?: string | null }): FlowCopy {
  switch (state) {
    case 'INITIALIZING':
      return { heading: 'Processing your payment', body: 'Sending M-Pesa payment request…' };
    case 'STK_SENT':
      return {
        heading: 'Check your phone',
        body: ctx.phoneMasked
          ? `An M-Pesa payment request has been sent to ${ctx.phoneMasked}.`
          : 'An M-Pesa payment request has been sent to your phone.',
        hint: 'Enter your M-Pesa PIN on your phone to complete the payment.',
      };
    case 'WAITING_FOR_CONFIRMATION':
      return {
        heading: 'Check your phone',
        body: ctx.phoneMasked
          ? `An M-Pesa payment request has been sent to ${ctx.phoneMasked}.`
          : 'An M-Pesa payment request has been sent to your phone.',
        hint: 'Enter your M-Pesa PIN on your phone to complete the payment.',
      };
    case 'VERIFYING':
      return {
        heading: 'Confirming your payment…',
        body: 'Please wait while we verify your M-Pesa transaction.',
      };
    case 'SUCCESS':
      return {
        heading: 'Payment successful',
        body: `${ctx.amount} has been received successfully.`,
      };
    case 'CANCELLED':
      return {
        heading: 'Payment cancelled',
        body: 'You cancelled the M-Pesa payment request.',
      };
    case 'TIMEOUT':
      return {
        heading: 'Payment request expired',
        body: 'The M-Pesa request was not completed in time.',
      };
    case 'FAILED':
    default:
      return {
        heading: 'Payment unsuccessful',
        body: 'The M-Pesa payment could not be completed. Please try again.',
      };
  }
}

/** Label for the retry control — an expired request is re-sent, not re-tried. */
export function retryLabelFor(state: PaymentFlowState): string | null {
  if (state === 'TIMEOUT') return 'Send M-Pesa Request Again';
  if (state === 'CANCELLED' || state === 'FAILED') return 'Try Again';
  return null;
}

/** sessionStorage key holding the number the buyer confirmed on checkout. */
export function payPhoneKey(orderId: string): string {
  return `tfk_pay_phone:${orderId}`;
}
