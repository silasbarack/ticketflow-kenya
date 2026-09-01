import { CURRENCY, PLATFORM_COMMISSION_RATE, USE_MOCK_DATA } from '@/constants/config';

/** Rounds to the nearest whole shilling — KES is not typically shown with cents. */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Grouped number only — the currency code is prefixed manually below.
 *
 * `style: 'currency'` renders KES as the localised symbol ("Ksh" under en-KE,
 * "KSh"/"KES" elsewhere depending on the platform's ICU data), so the app
 * showed different text on different devices. Formatting the number alone and
 * prefixing the ISO code keeps it "KES 1,500" everywhere.
 */
const numberFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return `${CURRENCY} ${numberFormatter.format(roundCurrency(amount))}`;
}

export interface OrderTotals {
  grossAmount: number;
  platformFee: number;
  organizerNet: number;
  /** What the customer pays. See `BUYER_PAYS_SERVICE_FEE` for why this varies. */
  totalPayable: number;
}

/**
 * Which side of the transaction carries the 9%.
 *
 * The live backend bills it as a buyer-paid service fee on top of the ticket
 * price (`totalAmount` = subtotal + fee, organizer keeps the full subtotal).
 * The mock fixture follows the organizer-absorbed model instead. Deriving this
 * from `USE_MOCK_DATA` keeps the checkout summary truthful in both modes
 * rather than describing one model while charging the other.
 */
export const BUYER_PAYS_SERVICE_FEE = !USE_MOCK_DATA;

/**
 * Client-side estimate only, shown so the buyer knows what to expect before
 * paying — the backend recalculates and is authoritative once an order exists.
 * Always charge `order.totalPayable`, never this.
 */
export function calculateOrderTotals(grossAmount: number): OrderTotals {
  const gross = roundCurrency(grossAmount);
  const platformFee = roundCurrency(gross * PLATFORM_COMMISSION_RATE);

  if (BUYER_PAYS_SERVICE_FEE) {
    return {
      grossAmount: gross,
      platformFee,
      organizerNet: gross,
      totalPayable: roundCurrency(gross + platformFee),
    };
  }

  return {
    grossAmount: gross,
    platformFee,
    organizerNet: roundCurrency(gross - platformFee),
    totalPayable: gross,
  };
}
