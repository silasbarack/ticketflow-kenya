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

export default function Logo({ variant = 'full', className = 'h-14' }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const src = '/ticketflow-logo-official.png';
  const aspect = '280 / 225';

  if (failed) {
    return (
      <span className={'inline-flex items-center rounded-lg bg-white px-2 py-1 font-black text-brand-700 ' + className}>
        TicketFlow Kenya
      </span>
    );
  }

  return (
    <span className={'relative inline-block shrink-0 overflow-hidden rounded-sm bg-white ' + className} style={{ aspectRatio: aspect }}>
      <Image
        src={src}
        alt="TicketFlow Kenya"
        fill
        priority={false}
        unoptimized
        sizes={variant === 'icon' ? '160px' : '280px'}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
