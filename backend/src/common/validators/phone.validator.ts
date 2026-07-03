/**
 * Matches Kenyan mobile numbers in local (07xxxxxxxx / 01xxxxxxxx) or
 * international (+254xxxxxxxxx / 254xxxxxxxxx) form. The 01 range covers
 * newer allocations (0110-0115 Safaricom, 0100s/0102-0106 Airtel, etc.) as
 * well as older 07 Safaricom/Airtel/Telkom blocks, so any 07/01 prefix is
 * accepted rather than hardcoding specific 4-digit prefixes that change
 * as the Communications Authority allocates new ranges.
 */
export const KENYA_PHONE_REGEX = /^(?:\+254|254|0)(7\d{8}|1\d{8})$/;

export const KENYA_PHONE_MESSAGE =
  'Phone must be a valid Kenyan number, e.g. 0712345678, 0112345678, or +254712345678';
