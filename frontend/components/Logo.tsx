'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark';
  className?: string;
  wordmarkClassName?: string;
  gradientId?: string;
}

export default function Logo({
  variant = 'full',
  className = 'h-14',
}: LogoProps) {
  const [failed, setFailed] = useState(false);
  const src = variant === 'icon' ? '/logo-icon.svg' : '/logo.png';
  const aspect = variant === 'icon' ? '1.7 / 1' : '1.25 / 1';

  if (failed) {
    return (
      <span className={`inline-flex items-center rounded-xl bg-white px-2 font-black text-brand-700 ${className}`}>
        TicketFlow
      </span>
    );
  }

  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ aspectRatio: aspect }}>
      <Image
        src={src}
        alt="TicketFlow Kenya"
        fill
        unoptimized
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
