/**
 * Password policy for a new password chosen through the reset flow: at least 8
 * characters with an uppercase letter, a lowercase letter and a digit.
 * Mirrors frontend/lib/password.ts — keep the two in step.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 8-128 characters and include an uppercase letter, a lowercase letter and a number';
