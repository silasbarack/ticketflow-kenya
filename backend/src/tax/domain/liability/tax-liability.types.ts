export type TaxLiabilityStatus =
  | "DRAFT"
  | "CALCULATED"
  | "RECONCILED"
  | "APPROVED"
  | "PRN_REQUIRED"
  | "PRN_ATTACHED"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "KRA_CONFIRMED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED"
  | "REQUIRES_REVIEW";

/**
 * Strict state machine. Every transition not listed here is rejected by
 * TaxLiabilityRepository.transition(). This is the single source of truth
 * for what's allowed — do not bypass it by calling prisma.taxLiability
 * .update({ data: { status } }) directly from application code.
 */
export const ALLOWED_LIABILITY_TRANSITIONS: Record<
  TaxLiabilityStatus,
  TaxLiabilityStatus[]
> = {
  DRAFT: ["CALCULATED", "CANCELLED"],
  CALCULATED: ["RECONCILED", "REQUIRES_REVIEW", "CANCELLED"],
  RECONCILED: ["APPROVED", "REJECTED", "REQUIRES_REVIEW"],
  APPROVED: ["PRN_REQUIRED", "CANCELLED"],
  PRN_REQUIRED: ["PRN_ATTACHED", "CANCELLED"],
  PRN_ATTACHED: ["PAYMENT_PROCESSING", "CANCELLED"],
  PAYMENT_PROCESSING: ["PAID", "FAILED", "REQUIRES_REVIEW"],
  PAID: ["KRA_CONFIRMED"],
  KRA_CONFIRMED: [],
  REJECTED: ["DRAFT"],
  FAILED: ["PAYMENT_PROCESSING", "REQUIRES_REVIEW"],
  CANCELLED: [],
  REQUIRES_REVIEW: ["CALCULATED", "RECONCILED", "CANCELLED"],
};

export class InvalidLiabilityTransitionError extends Error {
  constructor(from: TaxLiabilityStatus, to: TaxLiabilityStatus) {
    super(`Tax liability cannot transition from ${from} to ${to}`);
    this.name = "InvalidLiabilityTransitionError";
  }
}

export function assertValidTransition(
  from: TaxLiabilityStatus,
  to: TaxLiabilityStatus,
): void {
  if (!ALLOWED_LIABILITY_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidLiabilityTransitionError(from, to);
  }
}
