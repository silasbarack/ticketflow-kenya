// Public origin of the deployed frontend (also used for OG/JSON-LD URLs).
export const SITE_URL = 'https://ticketflow-frontend-w47s.onrender.com';

const SELF_HOSTED_POSTER_ORIGIN = /^https?:\/\/ticketflow-frontend-w47s\.onrender\.com(?=\/)/;

// Seeded events store poster URLs pointing at the deployed frontend. Serving
// them from the current host instead avoids broken/slow images whenever the
// free-tier Render service is asleep (and on localhost entirely).
export function resolvePosterUrl(url: string): string {
  return url.replace(SELF_HOSTED_POSTER_ORIGIN, '');
}

// OG/Twitter/JSON-LD need absolute URLs; newer rows store relative paths.
export function absolutePosterUrl(url: string): string {
  return url.startsWith('/') ? `${SITE_URL}${url}` : url;
}
