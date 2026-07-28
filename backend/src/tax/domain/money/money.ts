/**
 * Exact monetary arithmetic for the tax module.
 *
 * Money is ALWAYS represented as integer minor units (bigint) — never a
 * JavaScript `number`/float. 1 KES = 100 minor units (cents), so
 * KES 1,500.00 = 150000n minor units.
 *
 * Rates are basis points (bps): 1 bps = 0.01%, so 500 bps = 5%,
 * 1600 bps = 16%, 3000 bps = 30%. BPS_DENOMINATOR (10000) represents 100%.
 *
 * Every helper here is a pure function over bigint — no floating point is
 * ever introduced. This is the single place division/rounding happens for
 * the tax module; everywhere else should compose these primitives instead
 * of reimplementing rounding.
 */

export type CurrencyCode = "KES";

export interface Money {
  currency: CurrencyCode;
  minorUnits: bigint;
}

/**
 * Documented rounding modes.
 *  - HALF_UP: round half away from zero (standard commercial rounding,
 *    used for VAT-inclusive fee extraction and percentage fee/commission
 *    calculations in this module).
 *  - DOWN: truncate toward zero (drop any fractional minor-unit
 *    remainder). Some KRA guidance requires truncation rather than
 *    rounding for specific tax heads — kept available per tax rule.
 */
export type RoundingMode = "HALF_UP" | "DOWN";

export const BPS_DENOMINATOR = 10_000n;

export function money(
  minorUnits: bigint,
  currency: CurrencyCode = "KES",
): Money {
  return { currency, minorUnits };
}

export const ZERO_KES: Money = money(0n);

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minorUnits + b.minorUnits, a.currency);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minorUnits - b.minorUnits, a.currency);
}

export function sumMoney(
  items: Money[],
  currency: CurrencyCode = "KES",
): Money {
  return items.reduce((acc, m) => addMoney(acc, m), money(0n, currency));
}

export function negateMoney(a: Money): Money {
  return money(-a.minorUnits, a.currency);
}

export function isNegative(a: Money): boolean {
  return a.minorUnits < 0n;
}

export function multiplyMoneyByInt(a: Money, factor: number | bigint): Money {
  const f = typeof factor === "bigint" ? factor : BigInt(factor);
  return money(a.minorUnits * f, a.currency);
}

/**
 * Integer division with a documented rounding mode. Correct for negative
 * numerator/denominator (rounds away from / toward zero symmetrically).
 */
export function divideBigIntWithRounding(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode,
): bigint {
  if (denominator === 0n) {
    throw new Error("Division by zero in tax money arithmetic");
  }
  const negative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;

  let roundedAbs: bigint;
  switch (mode) {
    case "DOWN":
      roundedAbs = quotient;
      break;
    case "HALF_UP":
      roundedAbs = remainder * 2n >= absDenominator ? quotient + 1n : quotient;
      break;
    default:
      throw new Error(`Unsupported rounding mode: ${mode as string}`);
  }
  return negative ? -roundedAbs : roundedAbs;
}

/** amountMinor * rateBps / 10000, rounded per `mode`. */
export function percentageOfMinor(
  amountMinor: bigint,
  rateBps: number,
  mode: RoundingMode,
): bigint {
  return divideBigIntWithRounding(
    amountMinor * BigInt(rateBps),
    BPS_DENOMINATOR,
    mode,
  );
}

export function percentageOfMoney(
  a: Money,
  rateBps: number,
  mode: RoundingMode,
): Money {
  return money(percentageOfMinor(a.minorUnits, rateBps, mode), a.currency);
}

/**
 * VAT-inclusive extraction: given a gross (VAT-inclusive) amount and a VAT
 * rate, split it into { net, vat } such that net + vat === gross exactly
 * (the rounding residual is attributed to the VAT amount, which is the
 * conventional invoice-level treatment).
 *
 * net = gross * 10000 / (10000 + rateBps), rounded per `mode`.
 * vat = gross - net.
 */
export function extractVatFromInclusive(
  grossMinor: bigint,
  rateBps: number,
  mode: RoundingMode,
): { netMinor: bigint; vatMinor: bigint } {
  const netMinor = divideBigIntWithRounding(
    grossMinor * BPS_DENOMINATOR,
    BPS_DENOMINATOR + BigInt(rateBps),
    mode,
  );
  return { netMinor, vatMinor: grossMinor - netMinor };
}

/**
 * VAT-exclusive addition: given a net (VAT-exclusive) amount, compute the
 * VAT and the resulting gross.
 *
 * vat = net * rateBps / 10000, rounded per `mode`.
 * gross = net + vat.
 */
export function addVatToExclusive(
  netMinor: bigint,
  rateBps: number,
  mode: RoundingMode,
): { grossMinor: bigint; vatMinor: bigint } {
  const vatMinor = percentageOfMinor(netMinor, rateBps, mode);
  return { grossMinor: netMinor + vatMinor, vatMinor };
}

/**
 * Parses a decimal-string major-unit amount (e.g. "1500.00" or "1500") into
 * exact minor units. Never routes through `Number`/floating point.
 * Throws on malformed input rather than silently truncating.
 */
export function minorUnitsFromDecimalString(decimal: string): bigint {
  const trimmed = decimal.trim();
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid decimal money string: "${decimal}"`);
  }
  const [, sign, whole, fraction = ""] = match;
  const paddedFraction = fraction.padEnd(2, "0");
  const minor = BigInt(whole) * 100n + BigInt(paddedFraction || "0");
  return sign ? -minor : minor;
}

export function moneyFromDecimalString(
  decimal: string,
  currency: CurrencyCode = "KES",
): Money {
  return money(minorUnitsFromDecimalString(decimal), currency);
}

/** Formats minor units back to a fixed 2dp decimal string, e.g. 150000n -> "1500.00". */
export function decimalStringFromMinorUnits(minorUnits: bigint): string {
  const negative = minorUnits < 0n;
  const abs = negative ? -minorUnits : minorUnits;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

/** JSON-safe wire representation of a Money value (bigint cannot serialize natively). */
export interface SerializedMoney {
  currency: CurrencyCode;
  minorUnits: string;
  display: string;
}

export function serializeMoney(a: Money): SerializedMoney {
  return {
    currency: a.currency,
    minorUnits: a.minorUnits.toString(),
    display: decimalStringFromMinorUnits(a.minorUnits),
  };
}

export function deserializeMoney(a: SerializedMoney): Money {
  return money(BigInt(a.minorUnits), a.currency);
}
