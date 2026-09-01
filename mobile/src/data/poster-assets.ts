import { ImageSourcePropType } from 'react-native';
import { WEB_URL } from '@/constants/config';

/**
 * Event posters bundled into the app.
 *
 * Bundling means the catalogue renders instantly and works with no network at
 * all — the remote copies live on a free Render instance that sleeps when idle,
 * so relying on those URLs left every card showing a grey placeholder.
 *
 * STALE: these six files are the posters of the August 2026 events that the
 * backend has since archived, so none of them match a poster URL the API
 * returns today — they only still serve the (equally stale) mock catalogue in
 * `mock-events.ts`. The current lineup's artwork lives at
 * `frontend/public/events/posters/<slug>.webp`; once those files exist, copy
 * them into `assets/posters/` and re-key this map to the new slugs. Until then
 * every real poster is fetched from `WEB_URL`.
 */
const BUNDLED_POSTERS: Record<string, ImageSourcePropType> = {
  'august-nights-afro-fusion-live.jpg': require('../../assets/posters/august-nights-afro-fusion-live.jpg'),
  'coast-sevens-rugby-festival.jpg': require('../../assets/posters/coast-sevens-rugby-festival.jpg'),
  'nairobi-coffee-culture-festival.jpg': require('../../assets/posters/nairobi-coffee-culture-festival.jpg'),
  'nairobi-fintech-ai-summit-2026.jpg': require('../../assets/posters/nairobi-fintech-ai-summit-2026.jpg'),
  'sanaa-live-spoken-word-theatre-night.jpg': require('../../assets/posters/sanaa-live-spoken-word-theatre-night.jpg'),
  'watamu-ocean-seafood-festival.jpg': require('../../assets/posters/watamu-ocean-seafood-festival.jpg'),
};

/** Origin serving the web app's static assets. */
function webOrigin(): string | undefined {
  if (!WEB_URL) return undefined;
  try {
    return new URL(WEB_URL).origin;
  } catch {
    return undefined;
  }
}

/**
 * Turns whatever `posterUrl` we were given into something `<Image>` can render.
 *
 * Handles all three shapes the app sees:
 *  - `/events/posters/<slug>.webp` — what the backend stores. The file is a
 *    static asset of the *web* app rather than something the API serves, so it
 *    resolves against the web origin, not the API one. A bundled copy wins
 *    when there is one.
 *  - `https://…` — an absolute URL (organizer-uploaded posters) → used as-is.
 *  - anything unrecognised → `undefined`, so callers can fall back to a
 *    placeholder instead of rendering a broken image.
 */
export function resolvePosterSource(posterUrl?: string | null): ImageSourcePropType | undefined {
  if (!posterUrl) return undefined;

  const fileName = posterUrl.split('/').pop() ?? '';
  const bundled = BUNDLED_POSTERS[fileName];
  if (bundled) return bundled;

  if (/^https?:\/\//i.test(posterUrl)) return { uri: posterUrl };

  if (posterUrl.startsWith('/')) {
    const origin = webOrigin();
    return origin ? { uri: `${origin}${posterUrl}` } : undefined;
  }

  return undefined;
}
