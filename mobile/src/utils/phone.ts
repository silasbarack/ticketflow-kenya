/**
 * Normalizes a Kenyan mobile number to the `2547XXXXXXXX` / `2541XXXXXXXX`
 * format M-Pesa's STK push expects. Accepts local (07.., 01..), international
 * (+2547.., 2547..) and space/dash-separated input. Returns null if the
 * cleaned digits don't look like a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');

  let national: string | null = null;
  if (digits.startsWith('254') && digits.length === 12) {
    national = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.length === 9) {
    national = digits;
  }

  if (!national) return null;
  if (!/^[17]\d{8}$/.test(national)) return null;

  return `254${national}`;
}

export function isValidKenyanPhone(raw: string): boolean {
  return normalizeKenyanPhone(raw) !== null;
}

export function formatPhoneForDisplay(raw: string): string {
  const normalized = normalizeKenyanPhone(raw);
  if (!normalized) return raw;
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
}
