import {
  addMoney,
  addVatToExclusive,
  extractVatFromInclusive,
  Money,
  money,
  multiplyMoneyByInt,
  percentageOfMoney,
  RoundingMode,
  subMoney,
  sumMoney,
  ZERO_KES,
} from "../money/money";
import { stableHash } from "../audit/hash";
import {
  CalculateTicketSaleTaxInput,
  FeeCalculation,
  TaxCalculationComponent,
  TicketSaleTaxCalculation,
} from "./ticket-sale-tax.types";

/** The two output-VAT rates this calculation needs, resolved by the caller from effective-dated TaxRules. */
export interface TicketSaleTaxRates {
  /** TICKETFLOW_PLATFORM_OUTPUT_VAT rule applicable at input.transactionDate. */
  ticketFlowVatRateBps: number;
  ticketFlowRuleId: string;
  ticketFlowRoundingMode: RoundingMode;
  /** ORGANIZER_TICKET_OUTPUT_VAT rule applicable at input.transactionDate. */
  organizerVatRateBps: number;
  organizerRuleId: string;
  organizerRoundingMode: RoundingMode;
}

export interface CalculationIdGenerator {
  (): string;
}

/**
 * Computes a fee/commission amount from a FeeCalculation. For PERCENTAGE,
 * the rate is applied to `base` (the ticket face value gross) — this
 * mirrors the demo scenario: "organizer commission: 5% of ticket face
 * value". The resulting amount is expressed in whatever pricing mode the
 * fee declares (gross if VAT_INCLUSIVE, net if VAT_EXCLUSIVE); VAT is
 * applied/extracted afterward by the caller.
 */
function resolveFeeAmount(
  calculation: FeeCalculation,
  base: Money,
  rounding: RoundingMode,
): Money {
  if (calculation.kind === "FIXED") {
    return calculation.amount;
  }
  return percentageOfMoney(base, calculation.rateBps, rounding);
}

interface FeeVatResult {
  gross: Money;
  net: Money;
  vat: Money;
}

/**
 * Splits a fee amount into gross/net/vat given its declared pricing mode
 * and whether the charging party is VAT-registered. An unregistered party
 * cannot charge output VAT, so net === gross and vat === 0 in that case.
 */
function applyFeeVat(
  amount: Money,
  pricingMode: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE",
  isVatRegistered: boolean,
  rateBps: number,
  rounding: RoundingMode,
): FeeVatResult {
  if (!isVatRegistered) {
    return { gross: amount, net: amount, vat: money(0n, amount.currency) };
  }
  if (pricingMode === "VAT_INCLUSIVE") {
    const { netMinor, vatMinor } = extractVatFromInclusive(
      amount.minorUnits,
      rateBps,
      rounding,
    );
    return {
      gross: amount,
      net: money(netMinor, amount.currency),
      vat: money(vatMinor, amount.currency),
    };
  }
  const { grossMinor, vatMinor } = addVatToExclusive(
    amount.minorUnits,
    rateBps,
    rounding,
  );
  return {
    gross: money(grossMinor, amount.currency),
    net: amount,
    vat: money(vatMinor, amount.currency),
  };
}

/**
 * Pure, deterministic ticket-sale tax calculation. No I/O: the caller
 * resolves applicable TaxRule rates first (effective-dated lookup) and
 * supplies a calculation-id generator + clock so results are reproducible
 * in tests. See docs/ticketflow-tax-architecture.md for the accounting
 * treatment this implements (disclosed-agent vs principal-reseller).
 */
export function calculateTicketSaleTax(
  input: CalculateTicketSaleTaxInput,
  rates: TicketSaleTaxRates,
  generateId: CalculationIdGenerator,
): TicketSaleTaxCalculation {
  const currency = input.currency;
  const warnings: string[] = [];
  const components: TaxCalculationComponent[] = [];

  if (input.ticketLines.length === 0) {
    throw new Error("Cannot calculate tax for an order with no ticket lines");
  }

  // ---- 1. Ticket lines: face value + organizer (memorandum) ticket VAT ----
  let ticketFaceValueGross = money(0n, currency); // sum of listed line prices, pre any VAT-exclusive top-up
  let organizerTicketProceedsGross = money(0n, currency);
  let organizerTicketNetOfVat: Money | undefined;
  let organizerTicketOutputVat: Money | undefined;
  let anyTicketVatComputed = false;

  const organizerIsVatRegistered =
    input.organizerVatRegistrationStatus === "REGISTERED";

  for (const line of input.ticketLines) {
    const lineListed = multiplyMoneyByInt(line.unitTicketPrice, line.quantity);
    ticketFaceValueGross = addMoney(ticketFaceValueGross, lineListed);

    if (line.eventSupplyTreatment === "REQUIRES_REVIEW") {
      warnings.push(
        `Ticket type ${line.ticketTypeId} has VAT treatment REQUIRES_REVIEW — finance/tax must classify it before this calculation can be relied on for filing.`,
      );
    }

    const chargeableStandardRated =
      line.eventSupplyTreatment === "STANDARD_RATED";
    if (chargeableStandardRated && !organizerIsVatRegistered) {
      warnings.push(
        `Ticket type ${line.ticketTypeId} is marked STANDARD_RATED but the organizer is not VAT-registered (status: ${input.organizerVatRegistrationStatus}) — no organizer output VAT was computed. Verify organizer VAT registration.`,
      );
    }

    if (chargeableStandardRated && organizerIsVatRegistered) {
      anyTicketVatComputed = true;
      let lineGross: Money;
      let lineNet: Money;
      let lineVat: Money;
      if (line.ticketPricingMode === "VAT_INCLUSIVE") {
        const { netMinor, vatMinor } = extractVatFromInclusive(
          lineListed.minorUnits,
          rates.organizerVatRateBps,
          rates.organizerRoundingMode,
        );
        lineGross = lineListed;
        lineNet = money(netMinor, currency);
        lineVat = money(vatMinor, currency);
      } else {
        const { grossMinor, vatMinor } = addVatToExclusive(
          lineListed.minorUnits,
          rates.organizerVatRateBps,
          rates.organizerRoundingMode,
        );
        lineGross = money(grossMinor, currency);
        lineNet = lineListed;
        lineVat = money(vatMinor, currency);
      }
      organizerTicketProceedsGross = addMoney(
        organizerTicketProceedsGross,
        lineGross,
      );
      organizerTicketNetOfVat = addMoney(
        organizerTicketNetOfVat ?? ZERO_KES,
        lineNet,
      );
      organizerTicketOutputVat = addMoney(
        organizerTicketOutputVat ?? ZERO_KES,
        lineVat,
      );
      components.push({
        code: "ORGANIZER_TICKET_OUTPUT_VAT",
        owner: "ORGANIZER",
        taxBase: lineNet,
        rateBps: rates.organizerVatRateBps,
        taxAmount: lineVat,
        formula: `extractVatFromInclusive(ticketLine[${line.ticketTypeId}]=${lineListed.minorUnits}, ${rates.organizerVatRateBps}bps)`,
      });
    } else {
      // ZERO_RATED / EXEMPT / OUT_OF_SCOPE / REQUIRES_REVIEW / unregistered organizer: no VAT computed.
      organizerTicketProceedsGross = addMoney(
        organizerTicketProceedsGross,
        lineListed,
      );
      components.push({
        code: "ORGANIZER_TICKET_OUTPUT_VAT",
        owner: "ORGANIZER",
        taxBase: lineListed,
        rateBps: 0,
        taxAmount: money(0n, currency),
        formula: `no VAT — treatment=${line.eventSupplyTreatment}, organizerVatStatus=${input.organizerVatRegistrationStatus}`,
      });
    }
  }

  // ---- 2. Customer booking fee (always TicketFlow revenue) ----
  let bookingFeeGross = money(0n, currency);
  let bookingFeeNet = money(0n, currency);
  let bookingFeeVat = money(0n, currency);
  const ticketFlowIsVatRegistered =
    input.ticketFlowVatRegistrationStatus === "REGISTERED";

  if (input.customerBookingFee) {
    const amount = resolveFeeAmount(
      input.customerBookingFee.calculation,
      ticketFaceValueGross,
      rates.ticketFlowRoundingMode,
    );
    const result = applyFeeVat(
      amount,
      input.customerBookingFee.pricingMode,
      ticketFlowIsVatRegistered,
      rates.ticketFlowVatRateBps,
      rates.ticketFlowRoundingMode,
    );
    bookingFeeGross = result.gross;
    bookingFeeNet = result.net;
    bookingFeeVat = result.vat;
    components.push({
      code: "TICKETFLOW_PLATFORM_OUTPUT_VAT",
      owner: "TICKETFLOW",
      taxBase: bookingFeeNet,
      rateBps: ticketFlowIsVatRegistered ? rates.ticketFlowVatRateBps : 0,
      taxAmount: bookingFeeVat,
      formula: `bookingFee(${input.customerBookingFee.calculation.kind}, ${input.customerBookingFee.pricingMode})`,
    });
    if (!ticketFlowIsVatRegistered) {
      warnings.push(
        "TicketFlow is not VAT-registered — no output VAT was charged on the booking fee.",
      );
    }
  }

  // ---- 3. Organizer commission (TicketFlow revenue, deducted from organizer settlement) ----
  let commissionGross = money(0n, currency);
  let commissionNet = money(0n, currency);
  let commissionVat = money(0n, currency);

  if (input.organizerCommission) {
    const amount = resolveFeeAmount(
      input.organizerCommission.calculation,
      ticketFaceValueGross,
      rates.ticketFlowRoundingMode,
    );
    const result = applyFeeVat(
      amount,
      input.organizerCommission.pricingMode,
      ticketFlowIsVatRegistered,
      rates.ticketFlowVatRateBps,
      rates.ticketFlowRoundingMode,
    );
    commissionGross = result.gross;
    commissionNet = result.net;
    commissionVat = result.vat;
    components.push({
      code: "TICKETFLOW_PLATFORM_OUTPUT_VAT",
      owner: "TICKETFLOW",
      taxBase: commissionNet,
      rateBps: ticketFlowIsVatRegistered ? rates.ticketFlowVatRateBps : 0,
      taxAmount: commissionVat,
      formula: `organizerCommission(${input.organizerCommission.calculation.kind}, ${input.organizerCommission.pricingMode})`,
    });
  }

  const processorCharge = input.processorCharge ?? money(0n, currency);

  // ---- 4. Aggregate cash-flow outputs, which differ by agency model ----
  // Uses organizerTicketProceedsGross (the actual cash collected for
  // tickets) rather than the raw listed ticketFaceValueGross, because the
  // two diverge when a STANDARD_RATED line is VAT_EXCLUSIVE — VAT is then
  // added on top of the listed price, so the customer pays more than the
  // nominal ticket price. (They are equal for VAT_INCLUSIVE lines, which
  // is why this matches the demo scenario.) The listed ticketFaceValueGross
  // is still used as the PERCENTAGE fee/commission base — "5% of ticket
  // face value" means the nominal listed price, not the VAT-grossed-up one.
  let customerPayment = addMoney(organizerTicketProceedsGross, bookingFeeGross);
  if (input.processorChargeBearer === "CUSTOMER") {
    customerPayment = addMoney(customerPayment, processorCharge);
  }

  let organizerSettlementBeforeRefunds: Money;
  let ticketFlowRevenueExcludingVat: Money;
  let ticketFlowOutputVat: Money;
  let ticketFlowCashRetainedBeforeOtherCosts: Money;

  if (input.agencyModel === "DISCLOSED_AGENT") {
    organizerSettlementBeforeRefunds = subMoney(
      organizerTicketProceedsGross,
      commissionGross,
    );
    if (input.processorChargeBearer === "ORGANIZER") {
      organizerSettlementBeforeRefunds = subMoney(
        organizerSettlementBeforeRefunds,
        processorCharge,
      );
    }
    ticketFlowRevenueExcludingVat = addMoney(bookingFeeNet, commissionNet);
    ticketFlowOutputVat = addMoney(bookingFeeVat, commissionVat);
    ticketFlowCashRetainedBeforeOtherCosts = addMoney(
      bookingFeeGross,
      commissionGross,
    );
    if (input.processorChargeBearer === "TICKETFLOW") {
      ticketFlowCashRetainedBeforeOtherCosts = subMoney(
        ticketFlowCashRetainedBeforeOtherCosts,
        processorCharge,
      );
    }
  } else {
    // PRINCIPAL_RESELLER (not enabled by default — see CompanyTaxProfile.agencyModel).
    // TicketFlow is the seller of record: it recognizes the ticket sale itself as
    // its own revenue (net of the ticket's own output VAT, which TicketFlow now
    // owes rather than the organizer). The organizer's economic interest becomes
    // a fee TicketFlow pays them (reusing `organizerCommission` as that payout),
    // so the organizer's settlement is that fee, not the ticket face value.
    organizerSettlementBeforeRefunds = commissionGross;
    ticketFlowRevenueExcludingVat = subMoney(
      addMoney(organizerTicketNetOfVat ?? ticketFaceValueGross, bookingFeeNet),
      commissionNet,
    );
    ticketFlowOutputVat = addMoney(
      organizerTicketOutputVat ?? money(0n, currency),
      bookingFeeVat,
    );
    ticketFlowCashRetainedBeforeOtherCosts = subMoney(
      addMoney(organizerTicketProceedsGross, bookingFeeGross),
      commissionGross,
    );
    if (input.processorChargeBearer === "TICKETFLOW") {
      ticketFlowCashRetainedBeforeOtherCosts = subMoney(
        ticketFlowCashRetainedBeforeOtherCosts,
        processorCharge,
      );
    }
    warnings.push(
      "PRINCIPAL_RESELLER model: TicketFlow is recognizing the ticket sale as its own revenue and paying the organizer a contracted fee. Confirm whether withholding tax applies to that payment (SUPPLIER_WITHHOLDING_TAX) and that this matches the signed organizer contract.",
    );
  }

  if (!anyTicketVatComputed) {
    organizerTicketNetOfVat = undefined;
    organizerTicketOutputVat = undefined;
  }

  const calculationId = generateId();
  const ruleVersionIds = Array.from(
    new Set([rates.ticketFlowRuleId, rates.organizerRuleId]),
  );

  const base: Omit<TicketSaleTaxCalculation, "calculationHash"> = {
    calculationId,
    ruleVersionIds,
    customerPayment,
    organizerTicketProceedsGross,
    organizerTicketNetOfVat,
    organizerTicketOutputVat,
    bookingFeeGross,
    bookingFeeNet,
    bookingFeeVat,
    commissionGross,
    commissionNet,
    commissionVat,
    ticketFlowRevenueExcludingVat,
    ticketFlowOutputVat,
    processorCharge,
    organizerSettlementBeforeRefunds,
    ticketFlowCashRetainedBeforeOtherCosts,
    components,
    warnings,
  };

  const calculationHash = stableHash({ input, rates, base });

  return { ...base, calculationHash };
}

/** Sum helper re-exported for callers building organizer settlement reports from multiple calculations. */
export function sumCustomerPayments(
  calculations: TicketSaleTaxCalculation[],
): Money {
  return sumMoney(calculations.map((c) => c.customerPayment));
}
