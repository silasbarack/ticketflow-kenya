// Buyer-facing service fee, charged on top of the ticket price at checkout.
// Must match the backend's PLATFORM_COMMISSION_PERCENT (see backend/.env) —
// the backend recomputes the authoritative amounts at order creation.
export const SERVICE_FEE_PERCENT = parseFloat(
  process.env.NEXT_PUBLIC_SERVICE_FEE_PERCENT || '9',
);

export function serviceFeeFor(amount: number): number {
  return Math.round(amount * (SERVICE_FEE_PERCENT / 100) * 100) / 100;
}

export function totalWithServiceFee(amount: number): number {
  return Math.round((amount + serviceFeeFor(amount)) * 100) / 100;
}
