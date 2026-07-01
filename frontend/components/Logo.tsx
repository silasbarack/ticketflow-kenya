'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark';
  className?: string;
  /** Kept for API compatibility — unused now that logo is an image. */
  gradientId?: string;
}

/**
 * Renders the TicketFlow Kenya logo.
 * Place the downloaded logo file at frontend/public/logo.png to show it.
 * Falls back to a styled text mark if the image is unavailable.
 */
export default function Logo({ variant = 'full', theme = 'light', className = 'h-14' }: LogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const wordmarkColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  if (variant === 'icon') {
    return imgFailed ? (
      <span
        className={`inline-flex items-center justify-center rounded-xl bg-brand-700 font-black
                    text-white ${className}`}
        style={{ aspectRatio: '1' }}
      >
        TK
      </span>
    ) : (
      <span className={`relative inline-block ${className}`} style={{ aspectRatio: '1' }}>
        <Image
          src="/logo.png"
          alt="TicketFlow Kenya"
          fill
          unoptimized
          className="object-contain"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-3">
      {imgFailed ? (
        <span
          className="inline-flex h-14 w-14 items-center justify-center rounded-xl
                     bg-brand-700 text-sm font-black text-white"
        >
          TK
        </span>
      ) : (
        <span className={`relative inline-block ${className}`} style={{ aspectRatio: '1' }}>
          <Image
            src="/logo.png"
            alt="TicketFlow Kenya"
            fill
            unoptimized
            className="object-contain"
            onError={() => setImgFailed(true)}
          />
        </span>
      )}
      <span className={`text-xl font-bold leading-none ${wordmarkColor}`}>
        TicketFlow <span className="text-brand-700">Kenya</span>
      </span>
    </span>
  );
}
