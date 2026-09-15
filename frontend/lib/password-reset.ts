/**
 * Client-side state for the forgot-password flow.
 *
 * Kept in sessionStorage, not localStorage: it is scoped to this tab and gone
 * when the tab closes, so a reset authorisation cannot linger on a shared
 * computer. None of it is trusted — the backend re-checks everything — it only
 * lets each step know the previous one happened.
 */

const REQUEST_KEY = 'tfk_pwreset_request';
const AUTH_KEY = 'tfk_pwreset_auth';

export interface ResetRequestState {
  email: string;
  /** Epoch ms after which the emailed code no longer works. */
  codeExpiresAt: number;
  /** Epoch ms before which "Resend code" stays disabled. */
  resendAvailableAt: number;
}

export interface ResetAuthState {
  resetToken: string;
  /** Epoch ms after which the backend will refuse the reset. */
  expiresAt: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage refused (some private modes): the flow still works within this page.
  }
}

function remove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}

/** Shape of POST /auth/password-reset/request — identical for every email. */
export interface ResetRequestResponse {
  message: string;
  codeExpiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export function saveResetRequest(email: string, response: ResetRequestResponse) {
  const now = Date.now();
  write(REQUEST_KEY, {
    email,
    codeExpiresAt: now + response.codeExpiresInSeconds * 1000,
    resendAvailableAt: now + response.resendAvailableInSeconds * 1000,
  } satisfies ResetRequestState);
}

export const loadResetRequest = () => read<ResetRequestState>(REQUEST_KEY);

export function saveResetAuth(resetToken: string, expiresInSeconds: number) {
  write(AUTH_KEY, { resetToken, expiresAt: Date.now() + expiresInSeconds * 1000 } satisfies ResetAuthState);
  // The code has been spent; nothing should send the user back to enter it.
  remove(REQUEST_KEY);
}

/** The stored authorisation, or null once it has expired. */
export function loadResetAuth(): ResetAuthState | null {
  const auth = read<ResetAuthState>(AUTH_KEY);
  if (!auth || typeof auth.resetToken !== 'string' || auth.expiresAt <= Date.now()) {
    if (auth) remove(AUTH_KEY);
    return null;
  }
  return auth;
}

export function clearPasswordResetState() {
  remove(REQUEST_KEY);
  remove(AUTH_KEY);
}

/** "9:05" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
