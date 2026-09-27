/**
 * Tracks the API requests the browser has in flight and how long they take,
 * so the loading bar can follow the visitor's real connection instead of a
 * fixed animation. Fed by the axios interceptors in `lib/api.ts`.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const recentDurations: number[] = [];
let inFlight = 0;
let lastRequestStartedAt = 0;

export function requestStarted() {
  inFlight += 1;
  lastRequestStartedAt = Date.now();
  listeners.forEach((listener) => listener());
}

export function requestFinished(durationMs?: number) {
  inFlight = Math.max(0, inFlight - 1);
  if (durationMs !== undefined && Number.isFinite(durationMs) && durationMs >= 0) {
    recentDurations.push(durationMs);
    if (recentDurations.length > 8) recentDurations.shift();
  }
  listeners.forEach((listener) => listener());
}

export function getInFlightCount() {
  return inFlight;
}

export function getLastRequestStartedAt() {
  return lastRequestStartedAt;
}

export function subscribeToNetworkActivity(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type NetworkInformationLike = { rtt?: number; effectiveType?: string; saveData?: boolean };

const EFFECTIVE_TYPE_MS: Record<string, number> = { 'slow-2g': 2200, '2g': 1500, '3g': 700, '4g': 280 };

/**
 * How long one page round trip takes for this visitor right now, in ms.
 * Prefers what we have actually measured (median of recent API calls), then
 * the browser's own connection estimate (Network Information API, available
 * on Chrome/Android), then a conservative default.
 */
export function estimatedRoundTripMs() {
  let estimate: number | null = null;

  if (recentDurations.length > 0) {
    const sorted = [...recentDurations].sort((a, b) => a - b);
    estimate = sorted[Math.floor(sorted.length / 2)];
  } else if (typeof navigator !== 'undefined') {
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (connection?.rtt && connection.rtt > 0) {
      // A navigation needs a request plus a response body: roughly two RTTs.
      estimate = connection.rtt * 2;
    } else if (connection?.effectiveType && EFFECTIVE_TYPE_MS[connection.effectiveType]) {
      estimate = EFFECTIVE_TYPE_MS[connection.effectiveType];
    }
    if (estimate !== null && connection?.saveData) estimate *= 1.25;
  }

  return Math.round(Math.min(2500, Math.max(220, estimate ?? 400)));
}
