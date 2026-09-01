import axios from 'axios';

export type AppErrorCode =
  | 'NO_INTERNET'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'EVENT_NOT_FOUND'
  | 'SOLD_OUT'
  | 'PRICE_CHANGED'
  | 'DUPLICATE_ORDER'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_EXPIRED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
}

const FRIENDLY_MESSAGES: Record<AppErrorCode, string> = {
  NO_INTERNET: 'No internet connection. Check your network and try again.',
  TIMEOUT: 'That took too long to respond. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  VALIDATION: 'Please check the highlighted fields and try again.',
  EVENT_NOT_FOUND: 'This event is no longer available.',
  SOLD_OUT: 'Sorry, those tickets just sold out.',
  PRICE_CHANGED: 'Ticket prices have changed. Please review your order again.',
  DUPLICATE_ORDER: 'You already have an order in progress for this event.',
  PAYMENT_DECLINED: 'The payment was declined. You can try again.',
  PAYMENT_EXPIRED: 'The payment request expired before it was completed. Please try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again shortly.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

/** Backend error codes (from a custom `code` field) that map onto our AppErrorCode set. */
const BACKEND_CODE_MAP: Record<string, AppErrorCode> = {
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  TICKET_SOLD_OUT: 'SOLD_OUT',
  PRICE_CHANGED: 'PRICE_CHANGED',
  DUPLICATE_ORDER: 'DUPLICATE_ORDER',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
};

/**
 * Turns any thrown value (Axios error, plain Error, string) into a small,
 * customer-safe error. Never forwards raw NestJS/Prisma/stack-trace detail —
 * only known backend error codes or clean validation text pass through.
 */
export function normalizeError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: FRIENDLY_MESSAGES.TIMEOUT };
    }
    if (!error.response) {
      return { code: 'NO_INTERNET', message: FRIENDLY_MESSAGES.NO_INTERNET };
    }

    const status = error.response.status;
    const data = error.response.data as { code?: string; message?: string | string[] } | undefined;
    const backendCode = data?.code ? BACKEND_CODE_MAP[data.code] : undefined;

    if (backendCode) {
      return { code: backendCode, message: FRIENDLY_MESSAGES[backendCode] };
    }
    if (status === 401 || status === 403) {
      return { code: 'UNAUTHORIZED', message: FRIENDLY_MESSAGES.UNAUTHORIZED };
    }
    if (status === 404) {
      return { code: 'EVENT_NOT_FOUND', message: FRIENDLY_MESSAGES.EVENT_NOT_FOUND };
    }
    if (status === 409) {
      return { code: 'DUPLICATE_ORDER', message: FRIENDLY_MESSAGES.DUPLICATE_ORDER };
    }
    if (status === 400 || status === 422) {
      const validationMessage = Array.isArray(data?.message) ? data.message[0] : data?.message;
      return { code: 'VALIDATION', message: validationMessage || FRIENDLY_MESSAGES.VALIDATION };
    }
    if (status >= 500) {
      return { code: 'SERVER_ERROR', message: FRIENDLY_MESSAGES.SERVER_ERROR };
    }
    return { code: 'UNKNOWN', message: FRIENDLY_MESSAGES.UNKNOWN };
  }

  return { code: 'UNKNOWN', message: FRIENDLY_MESSAGES.UNKNOWN };
}
