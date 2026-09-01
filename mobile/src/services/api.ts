import axios, { AxiosError } from 'axios';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';
import { TokenStorage } from './secure-storage';

export const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/** Routes whose own 401 means "bad credentials", not "expired session". */
const AUTH_EXEMPT_PATHS = ['/auth/login', '/auth/register'];

/**
 * Called once when a refresh attempt fails (or there's no refresh token to
 * try). Registered by the auth store on startup so this module never needs
 * to import Zustand/navigation directly and risk a circular dependency.
 */
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await TokenStorage.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * The API issues a single long-lived JWT and exposes no refresh endpoint, so
 * a 401 on an authenticated route always means the session is finished. End it
 * once and let the auth store send the user back to login — there is nothing
 * to retry, which also means there is no retry loop to guard against.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const path = error.config?.url ?? '';
    const isAuthExempt = AUTH_EXEMPT_PATHS.some((p) => path.includes(p));

    if (error.response?.status === 401 && !isAuthExempt) {
      await TokenStorage.clear();
      onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);
