import {
  addMoney,
  addVatToExclusive,
  divideBigIntWithRounding,
  extractVatFromInclusive,
  Money,
  money,
  multiplyMoneyByInt,
  percentageOfMoney,
  RoundingMode,
  subMoney,
  ZERO_KES,
} from "../money/money";
import { stableHash } from "../audit/hash";
import {
  CalculateRefundTaxInput,
  RefundTaxCalculation,
  RefundTaxCalculationComponent,
} from "./refund-tax.types";

export interface RefundTaxRates {
  ticketFlowVatRateBps: number;
  ticketFlowRuleId: string;
  ticketFlowRoundingMode: RoundingMode;
  organizerVatRateBps: number;
  organizerRuleId: string;
  organizerRoundingMode: RoundingMode;
}

function applyFeeVat(
  amount: Money,
  pricingMode: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE",
  isRegistered: boolean,
  rateBps: number,
  rounding: RoundingMode,
) {
  if (!isRegistered) {
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
 * Pure, deterministic refund/cancellation tax calculation. Reuses the
 * SAME historical tax rules the original sale used (`rates` must be
 * resolved by the caller from `originalCalculation.ruleVersionIds`, not
 * today's rates) so a refund years later still reverses the exact amounts
 * originally charged.
 *
 * This never mutates or deletes the original TaxCalculation — the caller
 * persists this as a linked, additional record.
 */
export function calculateRefundTax(
  input: CalculateRefundTaxInput,
  rates: RefundTaxRates,
  generateId: () => string,
): RefundTaxCalculation {
  const currency = input.currency;
  const warnings: string[] = [];
  const components: RefundTaxCalculationComponent[] = [];

  for (const line of input.refundLines) {
    if (line.quantityRefunded < 0 || line.quantityRefunded > line.quantity) {
      throw new Error(
        `Invalid refund quantity for ticket type ${line.ticketTypeId}: refunding ${line.quantityRefunded} of ${line.quantity}`,
      );
    }
  }

  // ---- 1. Ticket face value + organizer VAT reversal, computed per line (not prorated) ----
  let refundableTicketFaceValue = money(0n, currency);
  let organizerTicketVatReversal: Money | undefined;
  let anyOrganizerVatReversed = false;
  let originalTicketTotal = money(0n, currency);
  let refundedTicketTotal = money(0n, currency);

  const organizerIsVatRegistered =
    input.organizerVatRegistrationStatus === "REGISTERED";

  for (const line of input.refundLines) {
    const originalLineTotal = multiplyMoneyByInt(
      line.unitTicketPrice,
      line.quantity,
    );
    const refundedLineTotal = multiplyMoneyByInt(
      line.unitTicketPrice,
      line.quantityRefunded,
    );
    originalTicketTotal = addMoney(originalTicketTotal, originalLineTotal);
    refundedTicketTotal = addMoney(refundedTicketTotal, refundedLineTotal);

    if (line.quantityRefunded === 0) continue;

    const chargeableStandardRated =
      line.eventSupplyTreatment === "STANDARD_RATED";
    if (chargeableStandardRated && organizerIsVatRegistered) {
      anyOrganizerVatReversed = true;
      let lineGross: Money;
      let lineVat: Money;
      if (line.ticketPricingMode === "VAT_INCLUSIVE") {
        const { netMinor, vatMinor } = extractVatFromInclusive(
          refundedLineTotal.minorUnits,
          rates.organizerVatRateBps,
          rates.organizerRoundingMode,
        );
        lineGross = refundedLineTotal;
        lineVat = money(vatMinor, currency);
        void netMinor;
      } else {
        const { grossMinor, vatMinor } = addVatToExclusive(
          refundedLineTotal.minorUnits,
          rates.organizerVatRateBps,
          rates.organizerRoundingMode,
        );
        lineGross = money(grossMinor, currency);
        lineVat = money(vatMinor, currency);
      }
      refundableTicketFaceValue = addMoney(
        refundableTicketFaceValue,
        lineGross,
      );
      organizerTicketVatReversal = addMoney(
        organizerTicketVatReversal ?? ZERO_KES,
        lineVat,
      );
      components.push({
        code: "ORGANIZER_TICKET_OUTPUT_VAT",
        owner: "ORGANIZER",
        taxBase: refundedLineTotal,
        rateBps: rates.organizerVatRateBps,
        taxAmount: negate(lineVat),
        formula: `reversal: ticketLine[${line.ticketTypeId}] qty ${line.quantityRefunded}/${line.quantity}`,
      });
    } else {
      refundableTicketFaceValue = addMoney(
        refundableTicketFaceValue,
        refundedLineTotal,
      );
    }
  }

  if (!anyOrganizerVatReversed) organizerTicketVatReversal = undefined;

  // ---- 2. Blended refund fraction (bps) for fee/commission proration ----
  const fractionBps =
    originalTicketTotal.minorUnits === 0n
      ? 0n
      : clampBps(
          divideBigIntWithRounding(
            refundedTicketTotal.minorUnits * 10_000n,
            originalTicketTotal.minorUnits,
            "HALF_UP",
          ),
        );

  // ---- 3. Booking fee reversal ----
  let refundableBookingFee = money(0n, currency);
  if (input.bookingFeeRefundPolicy === "FULL") {
    refundableBookingFee = input.originalBookingFeeGross;
  } else if (input.bookingFeeRefundPolicy === "PRORATED") {
    refundableBookingFee = percentageOfMoney(
      input.originalBookingFeeGross,
      Number(fractionBps),
      "HALF_UP",
    );
  }
  const nonRefundableFee = subMoney(
    input.originalBookingFeeGross,
    refundableBookingFee,
  );

  const ticketFlowIsVatRegistered =
    input.ticketFlowVatRegistrationStatus === "REGISTERED";
  const bookingFeeSplit = applyFeeVat(
    refundableBookingFee,
    input.bookingFeePricingMode,
    ticketFlowIsVatRegistered,
    rates.ticketFlowVatRateBps,
    rates.ticketFlowRoundingMode,
  );
  if (refundableBookingFee.minorUnits > 0n) {
    components.push({
      code: "TICKETFLOW_PLATFORM_OUTPUT_VAT",
      owner: "TICKETFLOW",
      taxBase: negate(bookingFeeSplit.net),
      rateBps: ticketFlowIsVatRegistered ? rates.ticketFlowVatRateBps : 0,
      taxAmount: negate(bookingFeeSplit.vat),
      formula: `reversal: bookingFee(${input.bookingFeeRefundPolicy})`,
    });
  }

  // ---- 4. Commission reversal ----
  let commissionReversalGross = money(0n, currency);
  if (input.commissionReversalPolicy === "FULL") {
    commissionReversalGross = input.originalCommissionGross;
  } else if (input.commissionReversalPolicy === "PRORATED") {
    commissionReversalGross = percentageOfMoney(
      input.originalCommissionGross,
      Number(fractionBps),
      "HALF_UP",
    );
  }
  const commissionSplit = applyFeeVat(
    commissionReversalGross,
    input.commissionPricingMode,
    ticketFlowIsVatRegistered,
    rates.ticketFlowVatRateBps,
    rates.ticketFlowRoundingMode,
  );
  if (commissionReversalGross.minorUnits > 0n) {
    components.push({
      code: "TICKETFLOW_PLATFORM_OUTPUT_VAT",
      owner: "TICKETFLOW",
      taxBase: negate(commissionSplit.net),
      rateBps: ticketFlowIsVatRegistered ? rates.ticketFlowVatRateBps : 0,
      taxAmount: negate(commissionSplit.vat),
      formula: `reversal: organizerCommission(${input.commissionReversalPolicy})`,
    });
  }

  const ticketFlowRevenueReversal = addMoney(
    bookingFeeSplit.net,
    commissionSplit.net,
  );
  const ticketFlowVatReversal = addMoney(
    bookingFeeSplit.vat,
    commissionSplit.vat,
  );
  const bookingFeeNetReversal = bookingFeeSplit.net;
  const bookingFeeVatReversal = bookingFeeSplit.vat;
  const commissionNetReversal = commissionSplit.net;
  const commissionVatReversal = commissionSplit.vat;

  // ---- 5. Organizer payable reversal (what TicketFlow owes back to / claws back from the organizer) ----
  let organizerPayableReversal: Money;
  if (input.agencyModel === "DISCLOSED_AGENT") {
    organizerPayableReversal = subMoney(
      refundableTicketFaceValue,
      commissionReversalGross,
    );
  } else {
    organizerPayableReversal = commissionReversalGross;
    warnings.push(
      "PRINCIPAL_RESELLER model: organizer payable reversal equals the reversed contracted fee, not ticket face value — confirm against the organizer contract.",
    );
  }

  // ---- 6. Processor charge treatment ----
  let processorChargeTreatment: RefundTaxCalculation["processorChargeTreatment"];
  if (!input.processorChargeRefundable) {
    processorChargeTreatment =
      input.processorChargeBearer === "ORGANIZER"
        ? "ABSORBED_BY_ORGANIZER"
        : "RETAINED_BY_PROCESSOR";
  } else if (input.processorChargeBearer === "TICKETFLOW") {
    processorChargeTreatment = "ABSORBED_BY_TICKETFLOW";
  } else if (input.processorChargeBearer === "ORGANIZER") {
    processorChargeTreatment = "ABSORBED_BY_ORGANIZER";
  } else {
    processorChargeTreatment = "REFUNDED_TO_CUSTOMER";
  }

  // ---- 7. Recovery / reserve when the organizer was already paid out ----
  let ticketFlowRecoveryRequired = money(0n, currency);
  let refundReserveRequired = money(0n, currency);
  if (
    input.organizerAlreadySettled &&
    organizerPayableReversal.minorUnits > 0n
  ) {
    ticketFlowRecoveryRequired = organizerPayableReversal;
    warnings.push(
      "Organizer was already settled for this order — TicketFlow must recover the reversed amount from the organizer rather than netting it off an unpaid payable.",
    );
    if (
      input.reason === "EVENT_CANCELLED" ||
      input.reason === "EVENT_POSTPONED"
    ) {
      refundReserveRequired = ticketFlowRecoveryRequired;
      warnings.push(
        "Event cancelled/postponed after organizer settlement carries elevated non-recovery risk — a refund reserve equal to the recovery amount is suggested pending finance review.",
      );
    }
  }

  const requiresEtimsCreditNote =
    refundableTicketFaceValue.minorUnits > 0n ||
    refundableBookingFee.minorUnits > 0n ||
    commissionReversalGross.minorUnits > 0n;

  const calculationId = generateId();
  const ruleVersionIds = Array.from(
    new Set([rates.ticketFlowRuleId, rates.organizerRuleId]),
  );

  const base: Omit<RefundTaxCalculation, "calculationHash"> = {
    calculationId,
    refundId: input.refundId,
    originalCalculationId: input.originalCalculationId,
    ruleVersionIds,
    refundableTicketFaceValue,
    refundableBookingFee,
    nonRefundableFee,
    ticketFlowRevenueReversal,
    ticketFlowVatReversal,
    bookingFeeNetReversal,
    bookingFeeVatReversal,
    commissionNetReversal,
    commissionVatReversal,
    organizerPayableReversal,
    organizerTicketVatReversal,
    processorChargeTreatment,
    organizerAlreadySettled: input.organizerAlreadySettled,
    ticketFlowRecoveryRequired,
    refundReserveRequired,
    requiresEtimsCreditNote,
    components,
    warnings,
  };

  const calculationHash = stableHash({ input, rates, base });
  return { ...base, calculationHash };
}

function negate(a: Money): Money {
  return money(-a.minorUnits, a.currency);
}

function clampBps(bps: bigint): bigint {
  if (bps < 0n) return 0n;
  if (bps > 10_000n) return 10_000n;
  return bps;
}
