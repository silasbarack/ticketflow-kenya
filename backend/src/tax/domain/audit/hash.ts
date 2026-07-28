import { createHash } from "crypto";

/**
 * Deterministic SHA-256 hash of any JSON-serializable value, used for:
 *  - `calculationHash` on immutable tax calculations, so a stored
 *    calculation can be proven unchanged and two inputs proven identical.
 *  - `beforeHash`/`afterHash` on TaxAuditEvent records.
 *
 * bigint values are stringified (JSON.stringify cannot serialize bigint by
 * default) and object keys are sorted so the hash does not depend on
 * property insertion order.
 */
export function stableHash(value: unknown): string {
  const canonical = canonicalize(value);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (typeof value === "bigint") {
    return `bigint:${value.toString()}`;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
