'use client';

import { useEffect, useState } from 'react';

export type CountdownPhase = 'upcoming' | 'live' | 'ended';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  phase: CountdownPhase;
  /** True once the event has started — live or ended. */
  isPast: boolean;
  /** "5d 12h" while counting down; "Happening now" / "Event ended" after. */
  label: string;
}

function computeCountdown(target: string | Date, end?: string | Date | null): Countdown {
  const now = Date.now();
  const diffMs = new Date(target).getTime() - now;

  if (diffMs <= 0) {
    // Without an end date the best we can say is that it has started. With
    // one, an event that is over is reported as over rather than staying
    // "Happening now" indefinitely.
    const ended = end != null && new Date(end).getTime() <= now;
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      phase: ended ? 'ended' : 'live',
      isPast: true,
      label: ended ? 'Event ended' : 'Happening now',
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  let label: string;
  if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  return { days, hours, minutes, phase: 'upcoming', isPast: false, label };
}

/** Ticks once a minute so cards update without re-rendering on every second. */
export function useCountdown(target: string | Date, end?: string | Date | null): Countdown {
  const [countdown, setCountdown] = useState<Countdown>(() => computeCountdown(target, end));

  useEffect(() => {
    setCountdown(computeCountdown(target, end));
    const id = setInterval(() => setCountdown(computeCountdown(target, end)), 60_000);
    return () => clearInterval(id);
  }, [target, end]);

  return countdown;
}
