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
