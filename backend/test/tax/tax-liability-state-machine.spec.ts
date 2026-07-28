import {
  ALLOWED_LIABILITY_TRANSITIONS,
  assertValidTransition,
  InvalidLiabilityTransitionError,
} from "../../src/tax/domain/liability/tax-liability.types";
import {
  assertDifferentActors,
  SameActorMakerCheckerError,
} from "../../src/tax/domain/permissions/tax-permission.types";

describe("tax liability state machine", () => {
  it("#26 a DRAFT liability cannot be paid", () => {
    expect(() => assertValidTransition("DRAFT", "PAID")).toThrow(
      InvalidLiabilityTransitionError,
    );
  });

  it("#27 an unreconciled (CALCULATED) liability cannot be approved", () => {
    expect(() => assertValidTransition("CALCULATED", "APPROVED")).toThrow(
      InvalidLiabilityTransitionError,
    );
    // it must go through RECONCILED first
    expect(() =>
      assertValidTransition("CALCULATED", "RECONCILED"),
    ).not.toThrow();
    expect(() => assertValidTransition("RECONCILED", "APPROVED")).not.toThrow();
  });

  it("a liability with no PRN cannot jump straight to PAYMENT_PROCESSING", () => {
    expect(() =>
      assertValidTransition("APPROVED", "PAYMENT_PROCESSING"),
    ).toThrow();
    expect(() =>
      assertValidTransition("APPROVED", "PRN_REQUIRED"),
    ).not.toThrow();
    expect(() =>
      assertValidTransition("PRN_REQUIRED", "PAYMENT_PROCESSING"),
    ).toThrow();
    expect(() =>
      assertValidTransition("PRN_ATTACHED", "PAYMENT_PROCESSING"),
    ).not.toThrow();
  });

  it("a PAID liability cannot be edited back to any pre-payment state", () => {
    expect(ALLOWED_LIABILITY_TRANSITIONS.PAID).toEqual(["KRA_CONFIRMED"]);
    expect(() => assertValidTransition("PAID", "CALCULATED")).toThrow();
    expect(() => assertValidTransition("PAID", "APPROVED")).toThrow();
  });

  it("KRA_CONFIRMED and CANCELLED are terminal", () => {
    expect(ALLOWED_LIABILITY_TRANSITIONS.KRA_CONFIRMED).toEqual([]);
    expect(ALLOWED_LIABILITY_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("a FAILED payment may be retried (transitions back to PAYMENT_PROCESSING)", () => {
    expect(() =>
      assertValidTransition("FAILED", "PAYMENT_PROCESSING"),
    ).not.toThrow();
  });

  it("REQUIRES_REVIEW cannot silently resume payment — it must go back through reconciliation/approval", () => {
    expect(ALLOWED_LIABILITY_TRANSITIONS.REQUIRES_REVIEW).toEqual([
      "CALCULATED",
      "RECONCILED",
      "CANCELLED",
    ]);
    expect(() =>
      assertValidTransition("REQUIRES_REVIEW", "PAYMENT_PROCESSING"),
    ).toThrow();
    expect(() => assertValidTransition("REQUIRES_REVIEW", "PAID")).toThrow();
  });
});

describe("maker-checker", () => {
  it("rejects the same user acting as both maker and checker", () => {
    expect(() => assertDifferentActors("approve", "user-1", "user-1")).toThrow(
      SameActorMakerCheckerError,
    );
  });

  it("allows two different users", () => {
    expect(() =>
      assertDifferentActors("approve", "user-1", "user-2"),
    ).not.toThrow();
  });

  it("allows the check when there was no maker recorded yet", () => {
    expect(() =>
      assertDifferentActors("approve", null, "user-2"),
    ).not.toThrow();
  });
});

describe("#25 organizer tax cannot be filed under TicketFlow's own PIN", () => {
  it("TaxLiabilityService.create rejects a TICKETFLOW-owned liability carrying an organizerId", async () => {
    const { TaxLiabilityService } =
      await import("../../src/tax/infrastructure/repositories/tax-liability.service");
    const fakePrisma: any = {
      taxLiability: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const fakeAudit: any = { log: jest.fn() };
    const service = new TaxLiabilityService(fakePrisma, fakeAudit);

    await expect(
      service.create(
        {
          taxHead: "VAT",
          owner: "TICKETFLOW",
          organizerId: "organizer-1",
          amountMinor: 1000n,
        },
        "admin-1",
      ),
    ).rejects.toThrow(/must not carry an organizerId/);
  });

  it("rejects an ORGANIZER-owned liability missing organizerId", async () => {
    const { TaxLiabilityService } =
      await import("../../src/tax/infrastructure/repositories/tax-liability.service");
    const fakePrisma: any = {
      taxLiability: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const fakeAudit: any = { log: jest.fn() };
    const service = new TaxLiabilityService(fakePrisma, fakeAudit);

    await expect(
      service.create(
        { taxHead: "VAT", owner: "ORGANIZER", amountMinor: 1000n },
        "admin-1",
      ),
    ).rejects.toThrow(/organizerId is required/);
  });
});
