/**
 * Safety net only — every tax API response should already convert Money
 * via serializeMoney()/toJsonSafe() before it reaches a controller return
 * value. This polyfill exists so that if a bigint field is ever missed,
 * the API returns its decimal string instead of Express/JSON.stringify
 * throwing a 500 with no useful message. Node has no native bigint JSON
 * support, so this is the standard, narrowly-scoped way to add one.
 */
export function installBigIntJsonPolyfill(): void {
  if (!(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON) {
    (BigInt.prototype as unknown as { toJSON: () => string }).toJSON =
      function toJSON(this: bigint) {
        return this.toString();
      };
  }
}
