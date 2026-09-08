import { PaymentStatus } from '@prisma/client';

/**
 * What the buyer is waiting on right now. `status` alone cannot express this:
 * PENDING covers everything from "we are still talking to Daraja" to "the PIN
 * has been entered and the result is in flight", and the checkout screen has to
 * say something different for each.
 */
export type PaymentStage =
  | 'INITIATED' // payment recorded, STK request still being sent to Daraja
  | 'AWAITING_CUSTOMER' // prompt is on the handset, waiting for the PIN
  | 'VERIFYING' // Safaricom is processing the result
  | 'SUCCESS'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED';

/** Stages the buyer can never move out of — polling stops here. */
export const FINAL_STAGES: PaymentStage[] = ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'];

export const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
  PaymentStatus.CANCELLED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
];

/** The shape the checkout screen polls. */
export interface PaymentStatusView {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  status: PaymentStatus;
  stage: PaymentStage;
  isFinal: boolean;
  amount: number;
  /** Never the full number — see maskPhone(). */
  phoneMasked: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  mpesaReceiptNumber: string | null;
  resultCode: string | null;
  resultDesc: string | null;
  /** Buyer-facing copy for the current stage. */
  message: string;
  /** When this STK prompt stops being valid, ISO-8601. */
  expiresAt: string | null;
  ticketsIssued: number;
  createdAt: string;
}

/**
 * "0712 *** 678" — enough for the buyer to recognise the handset the prompt
 * went to without echoing their full number back over the wire.
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('254') ? `0${digits.slice(3)}` : digits;
  if (local.length < 7) return null;
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}
