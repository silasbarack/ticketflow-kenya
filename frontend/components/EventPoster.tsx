'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { resolvePosterUrl } from '@/lib/posters';

/**
 * Renders an event's poster artwork.
 *
 * Posters are real raster files (WebP/JPEG) served from `public/events/posters/`
 * and addressed by `event.posterUrl` — never generated in the browser. There is
 * deliberately no illustrated fallback here: when a poster is missing the card
 * shows a neutral, obviously-empty error state, so a placeholder can never be
 * mistaken for finished artwork or quietly ship as one.
 */
export default function EventPoster({
  src,
  alt,
  priority = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  className = '',
  objectPosition = 'center 40%',
}: {
  src?: string | null;
  alt: string;
  /** Set on above-the-fold posters; everything else lazy-loads. */
  priority?: boolean;
  sizes?: string;
  className?: string;
  objectPosition?: string;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(src ? 'loading' : 'error');

  if (!src || status === 'error') {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-navy-900 text-white/40 ${className}`}
        role="img"
        aria-label={`${alt} — artwork unavailable`}
      >
        <ImageOff className="h-7 w-7" aria-hidden="true" />
        <span className="px-4 text-center text-[11px] font-semibold uppercase tracking-wide">
          Poster unavailable
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Holds the frame while the file decodes, so the card does not shift. */}
      {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-navy-900" aria-hidden="true" />}
      <Image
        src={resolvePosterUrl(src)}
        alt={alt}
        fill
        sizes={sizes}
        {...(priority ? { priority: true } : { loading: 'lazy' as const })}
        className={`object-cover ${className}`}
        style={{ objectPosition }}
        onLoad={() => setStatus('ready')}
        onError={() => {
          if (process.env.NODE_ENV !== 'production') {
            // Name the file that is missing — a silent fallback hides typos in
            // the seed data and posters that were never dropped into place.
            console.error(`[EventPoster] failed to load poster: ${src}`);
          }
          setStatus('error');
        }}
      />
    </>
  );
}
