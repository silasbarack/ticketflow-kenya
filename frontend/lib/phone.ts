/**
 * Matches Kenyan mobile numbers in local (07xxxxxxxx / 01xxxxxxxx) or
 * international (+254xxxxxxxxx / 254xxxxxxxxx) form, covering both the
 * classic 07 blocks and newer 01 allocations (e.g. 0111, 0112, 0113, 0114).
 * Mirrors backend/src/common/validators/phone.validator.ts.
 */
export const KENYA_PHONE_REGEX = /^(?:\+254|254|0)(7\d{8}|1\d{8})$/;

export const KENYA_PHONE_MESSAGE = 'Enter a valid Kenyan phone number, e.g. 0712345678 or 0112345678';

export function isValidKenyanPhone(phone: string): boolean {
  return KENYA_PHONE_REGEX.test(phone.trim().replace(/\s+/g, ''));
}

/**
 * Canonical 2547XXXXXXXX / 2541XXXXXXXX form, so two spellings of the same
 * line (0712…, +254712…) compare equal when we check the confirmation entry
 * against the number the order was reserved with.
 */
export function normalizeKenyanPhone(phone: string): string {
  const compact = phone.trim().replace(/[\s-]/g, '');
  const match = KENYA_PHONE_REGEX.exec(compact);
  return match ? `254${match[1]}` : compact;
}

/** "07•• ••• 678" — enough to recognise a number without printing it in full. */
export function maskKenyanPhone(phone: string): string {
  const normalized = normalizeKenyanPhone(phone);
  if (normalized.length < 6) return phone;
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}
