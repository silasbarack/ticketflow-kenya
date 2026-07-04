'use client';

import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
  label: string;
}

function computeCountdown(target: string | Date): Countdown {
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true, label: 'Happening now' };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  let label: string;
  if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  return { days, hours, minutes, isPast: false, label };
}

/** Ticks once a minute so cards update without re-rendering on every second. */
export function useCountdown(target: string | Date): Countdown {
  const [countdown, setCountdown] = useState<Countdown>(() => computeCountdown(target));

  useEffect(() => {
    setCountdown(computeCountdown(target));
    const id = setInterval(() => setCountdown(computeCountdown(target)), 60_000);
    return () => clearInterval(id);
  }, [target]);

  return countdown;
}
