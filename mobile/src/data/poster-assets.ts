import { ImageSourcePropType } from 'react-native';
import { WEB_URL } from '@/constants/config';

/**
 * Verified events use the official seller's absolute poster URLs. Archived
 * local artwork must never substitute for a current real-world listing.
 */
const BUNDLED_POSTERS: Record<string, ImageSourcePropType> = {};

/** Origin serving the web app's static assets for internal event posters. */
function webOrigin(): string | undefined {
  if (!WEB_URL) return undefined;
  try {
    return new URL(WEB_URL).origin;
  } catch {
    return undefined;
  }
}

/**
 * Turns a stored poster URL into something Expo Image can render.
 * Absolute official-seller URLs are used as-is. Root-relative internal event
 * assets are resolved against the configured web origin.
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
