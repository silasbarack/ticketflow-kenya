import Constants from 'expo-constants';

/**
 * When true, all `src/services/*` calls are served by the in-memory mock
 * layer (`src/data/mock-events.ts` + mock service implementations) instead
 * of hitting the real backend. Flip to `false` once the backend is reachable
 * from the device — screens never change, only the service implementations
 * swapped in from `src/services/index.ts` do.
 */
export const USE_MOCK_DATA = false;

const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Origin of the Next.js web app. Poster artwork is a static asset of the *web*
 * app (`frontend/public/events/posters/…`), not something the API serves, so
 * resolving a stored `posterUrl` against the API origin gives a 404.
 */
const CONFIGURED_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

/** Default ports, used when no URL is configured at all in dev. */
const DEV_API_PORT = 4000;
const DEV_WEB_PORT = 3000;

/**
 * Host of the machine serving Metro, e.g. `192.168.0.34` — the dev build gets
 * this from the URL it was launched with, so it is always the machine you are
 * actually developing on.
 */
function metroHost(): string | undefined {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri?.split(':')[0] || undefined;
}

/**
 * True for hosts that only mean anything on the local network — a LAN IP
 * literal or a loopback name. Those are the ones baked into `.env` that go
 * stale the moment DHCP hands out a different address; a real hostname
 * (a deployed backend) is deliberate and must never be rewritten.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.0.2.2' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * In a development build the LAN IP in `.env` is stale as soon as the network
 * changes, and the symptom is every screen failing with a network error that
 * looks like a backend outage. Metro already knows the right address — the app
 * is loading its own JavaScript from it — so in dev we keep the configured
 * port and path but swap in Metro's host.
 *
 * Only plain-HTTP local addresses are rewritten. Pointing `.env` at the
 * deployed backend (an https hostname) still works exactly as written, and
 * release builds never take this path at all.
 */
function resolveLocalUrl(
  configured: string | undefined,
  envVar: string,
  devPort: number,
  devPath = '',
): string | undefined {
  if (!__DEV__) return configured;

  // Over a tunnel, Metro's host is a public relay that is not our machine, so
  // there is nothing useful to borrow — trust `.env` as written.
  const host = metroHost();
  if (!host || !isLocalHost(host)) return configured;

  if (!configured) return `http://${host}:${devPort}${devPath}`;

  // Matched by hand rather than with `URL`: React Native's URL is a partial
  // implementation and its component setters are not dependable.
  const parts = /^http:\/\/([^/:]+)(:\d+)?(\/.*)?$/.exec(configured);
  if (!parts) return configured; // https or non-standard — deliberate.

  const [, configuredHost, port = '', path = ''] = parts;
  if (!isLocalHost(configuredHost) || configuredHost === host) return configured;

  const resolved = `http://${host}${port}${path}`;
  console.log(
    `[TicketFlow] ${envVar} points at ${configuredHost}, but Metro is served from ` +
      `${host}. Using ${resolved} for this session — update .env to silence this.`,
  );
  return resolved;
}

export const API_URL = resolveLocalUrl(CONFIGURED_API_URL, 'EXPO_PUBLIC_API_URL', DEV_API_PORT, '/api');

/**
 * Origin the web app is served from, used to load poster artwork. Falls back to
 * the API host on its usual web port so a dev machine running both needs no
 * extra configuration.
 */
export const WEB_URL = resolveLocalUrl(CONFIGURED_WEB_URL, 'EXPO_PUBLIC_WEB_URL', DEV_WEB_PORT);

if (!API_URL && !USE_MOCK_DATA) {
  // Real network calls would fail without a base URL — fail loudly in dev
  // rather than silently sending requests to `undefined`.
  console.error(
    '[TicketFlow] EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set it to your ' +
      "backend's LAN URL (e.g. http://192.168.1.100:4000/api), or set USE_MOCK_DATA to true in " +
      'src/constants/config.ts to keep developing without a backend.',
  );
} else if (!API_URL && __DEV__) {
  console.warn(
    '[TicketFlow] EXPO_PUBLIC_API_URL is not set. Running in mock mode, so this is safe for now, ' +
      'but real API calls will fail until it is configured.',
  );
}

export const REQUEST_TIMEOUT_MS = 15_000;

export const PAYMENT_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_POLL_TIMEOUT_MS = 120_000;

export const PLATFORM_COMMISSION_RATE = 0.09;

export const CURRENCY = 'KES';

export const MAX_TICKETS_PER_TIER = 10;
