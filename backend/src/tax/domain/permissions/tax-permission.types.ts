export type TaxPermission =
  | "TAX_CALCULATION_VIEW"
  | "TAX_PERIOD_PREPARE"
  | "TAX_LIABILITY_RECONCILE"
  | "TAX_LIABILITY_APPROVE"
  | "TAX_PRN_ATTACH"
  | "TAX_PAYMENT_INITIATE"
  | "TAX_PAYMENT_CONFIRM"
  | "TAX_PAYMENT_REVERSE"
  | "TAX_AUDIT_VIEW"
  | "ORGANIZER_TAX_CONFIGURE"
  | "ETIMS_RETRY";

export const ALL_TAX_PERMISSIONS: TaxPermission[] = [
  "TAX_CALCULATION_VIEW",
  "TAX_PERIOD_PREPARE",
  "TAX_LIABILITY_RECONCILE",
  "TAX_LIABILITY_APPROVE",
  "TAX_PRN_ATTACH",
  "TAX_PAYMENT_INITIATE",
  "TAX_PAYMENT_CONFIRM",
  "TAX_PAYMENT_REVERSE",
  "TAX_AUDIT_VIEW",
  "ORGANIZER_TAX_CONFIGURE",
  "ETIMS_RETRY",
];

/**
 * Maker-checker pairs: the same user may not hold both roles on the same
 * material action unless a documented low-value exception policy is
 * configured (TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR / maker-checker
 * bypass is NOT implemented here — see docs — so today this is always
 * enforced).
 */
export const MAKER_CHECKER_PAIRS: Array<{
  maker: TaxPermission;
  checker: TaxPermission;
}> = [
  { maker: "TAX_LIABILITY_RECONCILE", checker: "TAX_LIABILITY_APPROVE" },
  { maker: "TAX_PAYMENT_INITIATE", checker: "TAX_PAYMENT_CONFIRM" },
];

export class SameActorMakerCheckerError extends Error {
  constructor(action: string) {
    super(
      `${action}: the same user prepared and is attempting to approve/confirm this action — maker-checker requires two different users`,
    );
    this.name = "SameActorMakerCheckerError";
  }
}

export function assertDifferentActors(
  action: string,
  makerUserId: string | null | undefined,
  checkerUserId: string,
): void {
  if (makerUserId && makerUserId === checkerUserId) {
    throw new SameActorMakerCheckerError(action);
  }
}
