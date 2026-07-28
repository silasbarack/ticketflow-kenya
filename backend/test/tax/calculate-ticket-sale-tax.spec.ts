import {
  calculateTicketSaleTax,
  TicketSaleTaxRates,
} from "../../src/tax/domain/calculation/calculate-ticket-sale-tax.logic";
import { CalculateTicketSaleTaxInput } from "../../src/tax/domain/calculation/ticket-sale-tax.types";
import { money } from "../../src/tax/domain/money/money";

const STANDARD_RATES: TicketSaleTaxRates = {
  ticketFlowVatRateBps: 1600,
  ticketFlowRuleId: "rule-tf-vat-2024",
  ticketFlowRoundingMode: "HALF_UP",
  organizerVatRateBps: 1600,
  organizerRuleId: "rule-org-vat-2024",
  organizerRoundingMode: "HALF_UP",
};

let idCounter = 0;
const deterministicId = () => `calc-${++idCounter}`;

function baseInput(
  overrides: Partial<CalculateTicketSaleTaxInput> = {},
): CalculateTicketSaleTaxInput {
  return {
    transactionId: "txn-1",
    orderId: "order-1",
    eventId: "event-1",
    organizerId: "organizer-1",
    transactionDate: "2026-03-01T00:00:00.000Z",
    currency: "KES",
    agencyModel: "DISCLOSED_AGENT",
    ticketLines: [
      {
        ticketTypeId: "regular",
        quantity: 1,
        unitTicketPrice: money(150000n), // KES 1,500.00
        ticketPricingMode: "VAT_INCLUSIVE",
        eventSupplyTreatment: "STANDARD_RATED",
      },
    ],
    customerBookingFee: {
      calculation: { kind: "FIXED", amount: money(10000n) },
      pricingMode: "VAT_INCLUSIVE",
    }, // KES 100.00
    organizerCommission: {
      calculation: { kind: "PERCENTAGE", rateBps: 500 },
      pricingMode: "VAT_INCLUSIVE",
    }, // 5%
    processorCharge: money(4000n), // KES 40.00
    processorChargeBearer: "TICKETFLOW",
    ticketFlowVatRegistrationStatus: "REGISTERED",
    organizerVatRegistrationStatus: "REGISTERED",
    ...overrides,
  };
}

beforeEach(() => {
  idCounter = 0;
});

describe("CalculateTicketSaleTaxService — the KES 1,500 demonstration scenario (#32)", () => {
  it("matches every value specified in the task exactly", () => {
    const result = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );

    expect(result.customerPayment.minorUnits).toBe(160000n); // 1,600.00
    expect(result.commissionGross.minorUnits).toBe(7500n); // 75.00
    expect(result.bookingFeeNet.minorUnits).toBe(8621n); // 86.21
    expect(result.bookingFeeVat.minorUnits).toBe(1379n); // 13.79
    expect(result.commissionNet.minorUnits).toBe(6466n); // 64.66
    expect(result.commissionVat.minorUnits).toBe(1034n); // 10.34
    expect(result.ticketFlowRevenueExcludingVat.minorUnits).toBe(15087n); // 150.87
    expect(result.ticketFlowOutputVat.minorUnits).toBe(2413n); // 24.13
    expect(result.organizerSettlementBeforeRefunds.minorUnits).toBe(142500n); // 1,425.00
    expect(result.ticketFlowCashRetainedBeforeOtherCosts.minorUnits).toBe(
      13500n,
    ); // 135.00

    const cashAfterVat =
      result.ticketFlowCashRetainedBeforeOtherCosts.minorUnits -
      result.ticketFlowOutputVat.minorUnits;
    expect(cashAfterVat).toBe(11087n); // 110.87

    expect(result.calculationHash).toHaveLength(64); // sha256 hex
    expect(result.ruleVersionIds.sort()).toEqual([
      "rule-org-vat-2024",
      "rule-tf-vat-2024",
    ]);
  });

  it("is deterministic for identical input and rates", () => {
    const a = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      () => "fixed-id",
    );
    const b = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      () => "fixed-id",
    );
    expect(a.calculationHash).toBe(b.calculationHash);
  });
});

describe("fee calculation modes (#1-#6)", () => {
  it("#1/#2 extracts VAT for a VAT-inclusive fee and adds VAT for a VAT-exclusive fee identically in magnitude", () => {
    const inclusive = calculateTicketSaleTax(
      baseInput({
        customerBookingFee: {
          calculation: { kind: "FIXED", amount: money(10000n) },
          pricingMode: "VAT_INCLUSIVE",
        },
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(inclusive.bookingFeeGross.minorUnits).toBe(10000n);
    expect(
      inclusive.bookingFeeNet.minorUnits + inclusive.bookingFeeVat.minorUnits,
    ).toBe(10000n);

    const exclusive = calculateTicketSaleTax(
      baseInput({
        customerBookingFee: {
          calculation: { kind: "FIXED", amount: money(8621n) },
          pricingMode: "VAT_EXCLUSIVE",
        },
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(exclusive.bookingFeeNet.minorUnits).toBe(8621n);
    expect(exclusive.bookingFeeVat.minorUnits).toBe(1379n); // 8621 * 16% rounded
  });

  it("#3 fixed booking fee is charged regardless of ticket price", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        customerBookingFee: {
          calculation: { kind: "FIXED", amount: money(5000n) },
          pricingMode: "VAT_INCLUSIVE",
        },
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.bookingFeeGross.minorUnits).toBe(5000n);
  });

  it("#4 percentage booking fee scales with ticket face value", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        customerBookingFee: {
          calculation: { kind: "PERCENTAGE", rateBps: 1000 },
          pricingMode: "VAT_INCLUSIVE",
        },
      }), // 10%
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.bookingFeeGross.minorUnits).toBe(15000n); // 10% of 1500.00
  });

  it("#5 fixed organizer commission does not depend on ticket price", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        organizerCommission: {
          calculation: { kind: "FIXED", amount: money(20000n) },
          pricingMode: "VAT_INCLUSIVE",
        },
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.commissionGross.minorUnits).toBe(20000n);
  });

  it("#6 percentage organizer commission scales with ticket face value (also the demo case)", () => {
    const result = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.commissionGross.minorUnits).toBe(7500n);
  });
});

describe("VAT registration status (#7, #8)", () => {
  it("#7 VAT-registered TicketFlow charges output VAT on its fees", () => {
    const result = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.ticketFlowOutputVat.minorUnits).toBeGreaterThan(0n);
  });

  it("#8 non-VAT-registered TicketFlow charges zero output VAT and keeps gross === net", () => {
    const result = calculateTicketSaleTax(
      baseInput({ ticketFlowVatRegistrationStatus: "NOT_REGISTERED" }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.ticketFlowOutputVat.minorUnits).toBe(0n);
    expect(result.bookingFeeNet.minorUnits).toBe(
      result.bookingFeeGross.minorUnits,
    );
    expect(result.commissionNet.minorUnits).toBe(
      result.commissionGross.minorUnits,
    );
    expect(result.warnings.some((w) => w.includes("not VAT-registered"))).toBe(
      true,
    );
  });
});

describe("organizer ticket VAT treatment (#9, #10, #11, #12)", () => {
  it("#9 standard-rated + registered organizer computes an organizer ticket VAT memo", () => {
    const result = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerTicketOutputVat).toBeDefined();
    expect(result.organizerTicketOutputVat!.minorUnits).toBe(20690n); // 1500 gross -> net 1293.10, vat 206.90
  });

  it("#10 exempt organizer ticket computes zero VAT and leaves proceeds unchanged", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        ticketLines: [
          {
            ticketTypeId: "regular",
            quantity: 1,
            unitTicketPrice: money(150000n),
            ticketPricingMode: "VAT_INCLUSIVE",
            eventSupplyTreatment: "EXEMPT",
          },
        ],
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerTicketOutputVat).toBeUndefined();
    expect(result.organizerTicketProceedsGross.minorUnits).toBe(150000n);
  });

  it("#11 zero-rated organizer ticket computes zero VAT", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        ticketLines: [
          {
            ticketTypeId: "regular",
            quantity: 1,
            unitTicketPrice: money(150000n),
            ticketPricingMode: "VAT_INCLUSIVE",
            eventSupplyTreatment: "ZERO_RATED",
          },
        ],
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerTicketOutputVat).toBeUndefined();
  });

  it("#12 REQUIRES_REVIEW treatment surfaces a warning and never silently assumes standard-rated", () => {
    const result = calculateTicketSaleTax(
      baseInput({
        ticketLines: [
          {
            ticketTypeId: "regular",
            quantity: 1,
            unitTicketPrice: money(150000n),
            ticketPricingMode: "VAT_INCLUSIVE",
            eventSupplyTreatment: "REQUIRES_REVIEW",
          },
        ],
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerTicketOutputVat).toBeUndefined();
    expect(result.warnings.some((w) => w.includes("REQUIRES_REVIEW"))).toBe(
      true,
    );
  });
});

describe("agency model revenue recognition (#13, #14)", () => {
  it("#13 disclosed-agent: organizer settlement = ticket face value minus commission", () => {
    const result = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerSettlementBeforeRefunds.minorUnits).toBe(
      150000n - 7500n,
    );
  });

  it("#14 principal-reseller: organizer settlement equals the contracted fee, not ticket face value, and TicketFlow recognizes the ticket sale as its own revenue", () => {
    const result = calculateTicketSaleTax(
      baseInput({ agencyModel: "PRINCIPAL_RESELLER" }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(result.organizerSettlementBeforeRefunds.minorUnits).toBe(
      result.commissionGross.minorUnits,
    );
    expect(result.organizerSettlementBeforeRefunds.minorUnits).not.toBe(
      150000n - 7500n,
    );
    expect(result.warnings.some((w) => w.includes("PRINCIPAL_RESELLER"))).toBe(
      true,
    );
  });
});

describe("processor charge bearer (#15, #16)", () => {
  it("#15 TicketFlow-borne processor fee reduces TicketFlow cash retained", () => {
    const withCharge = calculateTicketSaleTax(
      baseInput({ processorChargeBearer: "TICKETFLOW" }),
      STANDARD_RATES,
      deterministicId,
    );
    const withoutCharge = calculateTicketSaleTax(
      baseInput({
        processorCharge: money(0n),
        processorChargeBearer: "TICKETFLOW",
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(
      withoutCharge.ticketFlowCashRetainedBeforeOtherCosts.minorUnits -
        withCharge.ticketFlowCashRetainedBeforeOtherCosts.minorUnits,
    ).toBe(4000n);
    expect(withCharge.organizerSettlementBeforeRefunds.minorUnits).toBe(
      withoutCharge.organizerSettlementBeforeRefunds.minorUnits,
    );
  });

  it("#16 organizer-borne processor fee reduces organizer settlement, not TicketFlow cash retained", () => {
    const result = calculateTicketSaleTax(
      baseInput({ processorChargeBearer: "ORGANIZER" }),
      STANDARD_RATES,
      deterministicId,
    );
    const noCharge = calculateTicketSaleTax(
      baseInput({
        processorCharge: money(0n),
        processorChargeBearer: "ORGANIZER",
      }),
      STANDARD_RATES,
      deterministicId,
    );
    expect(
      noCharge.organizerSettlementBeforeRefunds.minorUnits -
        result.organizerSettlementBeforeRefunds.minorUnits,
    ).toBe(4000n);
    expect(result.ticketFlowCashRetainedBeforeOtherCosts.minorUnits).toBe(
      noCharge.ticketFlowCashRetainedBeforeOtherCosts.minorUnits,
    );
  });
});

describe("historical rule usage (#30)", () => {
  it("uses whatever rate object is supplied, so a 2023 rate produces different figures than the 2026 rate", () => {
    const historicalRates: TicketSaleTaxRates = {
      ...STANDARD_RATES,
      ticketFlowVatRateBps: 1400,
      ticketFlowRuleId: "rule-tf-vat-2023",
    };
    const historical = calculateTicketSaleTax(
      baseInput({ transactionDate: "2023-06-01T00:00:00.000Z" }),
      historicalRates,
      deterministicId,
    );
    const current = calculateTicketSaleTax(
      baseInput(),
      STANDARD_RATES,
      deterministicId,
    );
    expect(historical.bookingFeeVat.minorUnits).not.toBe(
      current.bookingFeeVat.minorUnits,
    );
    expect(historical.ruleVersionIds).toContain("rule-tf-vat-2023");
  });
});

describe("input validation", () => {
  it("throws when there are no ticket lines", () => {
    expect(() =>
      calculateTicketSaleTax(
        baseInput({ ticketLines: [] }),
        STANDARD_RATES,
        deterministicId,
      ),
    ).toThrow();
  });
});
