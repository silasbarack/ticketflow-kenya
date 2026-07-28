import {
  calculateRefundTax,
  RefundTaxRates,
} from "../../src/tax/domain/refund/calculate-refund-tax.logic";
import { CalculateRefundTaxInput } from "../../src/tax/domain/refund/refund-tax.types";
import { money } from "../../src/tax/domain/money/money";

const RATES: RefundTaxRates = {
  ticketFlowVatRateBps: 1600,
  ticketFlowRuleId: "rule-tf-vat-2024",
  ticketFlowRoundingMode: "HALF_UP",
  organizerVatRateBps: 1600,
  organizerRuleId: "rule-org-vat-2024",
  organizerRoundingMode: "HALF_UP",
};

let counter = 0;
const id = () => `refund-calc-${++counter}`;

function baseInput(
  overrides: Partial<CalculateRefundTaxInput> = {},
): CalculateRefundTaxInput {
  return {
    refundId: "refund-1",
    orderId: "order-1",
    originalCalculationId: "calc-1",
    reason: "CUSTOMER_REQUEST",
    transactionDate: "2026-03-05T00:00:00.000Z",
    currency: "KES",
    agencyModel: "DISCLOSED_AGENT",
    refundLines: [
      {
        ticketTypeId: "regular",
        quantity: 2,
        quantityRefunded: 2,
        unitTicketPrice: money(150000n),
        ticketPricingMode: "VAT_INCLUSIVE",
        eventSupplyTreatment: "STANDARD_RATED",
      },
    ],
    originalBookingFeeGross: money(20000n), // KES 200.00 for 2 tickets
    bookingFeePricingMode: "VAT_INCLUSIVE",
    bookingFeeRefundPolicy: "FULL",
    originalCommissionGross: money(15000n), // 5% of 3000.00
    commissionPricingMode: "VAT_INCLUSIVE",
    commissionReversalPolicy: "FULL",
    ticketFlowVatRegistrationStatus: "REGISTERED",
    organizerVatRegistrationStatus: "REGISTERED",
    processorCharge: money(8000n),
    processorChargeBearer: "TICKETFLOW",
    processorChargeRefundable: false,
    organizerAlreadySettled: false,
    ...overrides,
  };
}

beforeEach(() => {
  counter = 0;
});

describe("#17 full refund", () => {
  it("reverses the entire ticket face value, booking fee and commission", () => {
    const result = calculateRefundTax(baseInput(), RATES, id);
    expect(result.refundableTicketFaceValue.minorUnits).toBe(300000n); // 2 x 1500.00
    expect(result.refundableBookingFee.minorUnits).toBe(20000n);
    expect(result.nonRefundableFee.minorUnits).toBe(0n);
    expect(result.organizerPayableReversal.minorUnits).toBe(300000n - 15000n);
    expect(result.requiresEtimsCreditNote).toBe(true);
  });
});

describe("#18 partial refund", () => {
  it("only reverses the refunded quantity, prorating fees by value", () => {
    const result = calculateRefundTax(
      baseInput({
        refundLines: [
          {
            ticketTypeId: "regular",
            quantity: 2,
            quantityRefunded: 1,
            unitTicketPrice: money(150000n),
            ticketPricingMode: "VAT_INCLUSIVE",
            eventSupplyTreatment: "STANDARD_RATED",
          },
        ],
        bookingFeeRefundPolicy: "PRORATED",
        commissionReversalPolicy: "PRORATED",
      }),
      RATES,
      id,
    );
    expect(result.refundableTicketFaceValue.minorUnits).toBe(150000n); // 1 of 2 tickets
    expect(result.refundableBookingFee.minorUnits).toBe(10000n); // 50% of 200.00
    expect(result.nonRefundableFee.minorUnits).toBe(10000n);
  });

  it("rejects a refund quantity greater than what was sold", () => {
    expect(() =>
      calculateRefundTax(
        baseInput({
          refundLines: [
            {
              ticketTypeId: "regular",
              quantity: 2,
              quantityRefunded: 5,
              unitTicketPrice: money(150000n),
              ticketPricingMode: "VAT_INCLUSIVE",
              eventSupplyTreatment: "STANDARD_RATED",
            },
          ],
        }),
        RATES,
        id,
      ),
    ).toThrow();
  });
});

describe("#19 event cancellation after organizer settlement", () => {
  it("flags recovery-required and a refund reserve when the organizer was already paid", () => {
    const result = calculateRefundTax(
      baseInput({ reason: "EVENT_CANCELLED", organizerAlreadySettled: true }),
      RATES,
      id,
    );
    expect(result.ticketFlowRecoveryRequired.minorUnits).toBe(
      result.organizerPayableReversal.minorUnits,
    );
    expect(result.ticketFlowRecoveryRequired.minorUnits).toBeGreaterThan(0n);
    expect(result.refundReserveRequired.minorUnits).toBe(
      result.ticketFlowRecoveryRequired.minorUnits,
    );
    expect(
      result.warnings.some(
        (w) =>
          w.includes("already been settled") || w.includes("already settled"),
      ),
    ).toBe(true);
  });

  it("requires no recovery when the organizer had not yet been settled", () => {
    const result = calculateRefundTax(
      baseInput({ reason: "EVENT_CANCELLED", organizerAlreadySettled: false }),
      RATES,
      id,
    );
    expect(result.ticketFlowRecoveryRequired.minorUnits).toBe(0n);
    expect(result.refundReserveRequired.minorUnits).toBe(0n);
  });
});

describe("#20 credit-note generation", () => {
  it("flags requiresEtimsCreditNote whenever any TicketFlow-owned amount is reversed", () => {
    const withFees = calculateRefundTax(baseInput(), RATES, id);
    expect(withFees.requiresEtimsCreditNote).toBe(true);
  });

  it("does not require a credit note when nothing TicketFlow-owned is reversed", () => {
    const result = calculateRefundTax(
      baseInput({
        refundLines: [
          {
            ticketTypeId: "regular",
            quantity: 2,
            quantityRefunded: 0,
            unitTicketPrice: money(150000n),
            ticketPricingMode: "VAT_INCLUSIVE",
            eventSupplyTreatment: "STANDARD_RATED",
          },
        ],
        bookingFeeRefundPolicy: "NON_REFUNDABLE",
        commissionReversalPolicy: "NONE",
      }),
      RATES,
      id,
    );
    expect(result.requiresEtimsCreditNote).toBe(false);
  });

  it("does not mutate or delete the original calculation id — it only links to it", () => {
    const result = calculateRefundTax(baseInput(), RATES, id);
    expect(result.originalCalculationId).toBe("calc-1");
    expect(result.calculationId).not.toBe("calc-1");
  });
});

describe("processor charge treatment", () => {
  it("marks a non-refundable, TicketFlow-borne processor charge as RETAINED_BY_PROCESSOR", () => {
    const result = calculateRefundTax(
      baseInput({ processorChargeRefundable: false }),
      RATES,
      id,
    );
    expect(result.processorChargeTreatment).toBe("RETAINED_BY_PROCESSOR");
  });

  it("marks a refundable, organizer-borne processor charge as ABSORBED_BY_ORGANIZER", () => {
    const result = calculateRefundTax(
      baseInput({
        processorChargeBearer: "ORGANIZER",
        processorChargeRefundable: true,
      }),
      RATES,
      id,
    );
    expect(result.processorChargeTreatment).toBe("ABSORBED_BY_ORGANIZER");
  });
});
