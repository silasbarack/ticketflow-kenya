/**
 * Password policy for choosing a new password. Mirrors
 * backend/src/common/validators/password.validator.ts — the backend is the
 * authority; this only lets the form explain the rules as the user types.
 */
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= PASSWORD_MAX_LENGTH },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
];

export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(password));
}

/** 0-4, for the strength meter. Policy compliance is 3; length and variety earn the rest. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  const met = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  let score = Math.max(0, met - 1);
  if (meetsPasswordPolicy(password) && (password.length >= 12 || /[^A-Za-z0-9]/.test(password))) score += 1;
  return Math.min(score, 4);
}
