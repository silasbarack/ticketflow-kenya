import axios, { InternalAxiosRequestConfig } from 'axios';
import { requestFinished, requestStarted } from '@/lib/network-activity';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
});

// Start times of in-flight requests, for the connection-aware loading bar.
const requestStartTimes = new WeakMap<InternalAxiosRequestConfig, number>();

function settle(config: InternalAxiosRequestConfig | undefined) {
  if (typeof window === 'undefined' || !config) return;
  const startedAt = requestStartTimes.get(config);
  if (startedAt === undefined) return;
  requestStartTimes.delete(config);
  requestFinished(performance.now() - startedAt);
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    requestStartTimes.set(config, performance.now());
    requestStarted();
    const token = window.localStorage.getItem('tfk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    settle(response.config);
    return response;
  },
  (error) => {
    settle(error?.config);
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      window.localStorage.removeItem('tfk_token');
      window.localStorage.removeItem('tfk_user');
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  return 'Something went wrong. Please try again.';
}
