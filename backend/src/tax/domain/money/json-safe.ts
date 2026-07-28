/**
 * Deep-converts bigint values to strings so a structure can be stored in a
 * Postgres `Json` column or returned from an HTTP handler. Plain
 * `JSON.stringify` throws on bigint — this is the explicit serialization
 * function required instead of relying on any implicit coercion.
 */
export function toJsonSafe<T>(value: T): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toJsonSafe(v);
    }
    return result;
  }
  return value;
}
