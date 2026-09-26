/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';

interface LogoProps {
  /** `full` = horizontal lockup, `stacked` = mark over wordmark, `icon` = ticket mark only. */
  variant?: 'full' | 'stacked' | 'icon';
  /**
   * `light` backgrounds get the dark wordmark, `dark` backgrounds the white one.
   * `auto` follows the user's appearance setting (html[data-theme]).
   */
  theme?: 'light' | 'dark' | 'auto';
  /** Sets the rendered height (e.g. `h-10`); width follows the artwork. */
  className?: string;
  /** Kept for call-site compatibility — the wordmark is part of the artwork. */
  wordmarkClassName?: string;
}

const SOURCES = {
  full: { light: '/brand/ticketflow-logo-horizontal.png', dark: '/brand/ticketflow-logo-horizontal-light.png' },
  stacked: { light: '/brand/ticketflow-logo.png', dark: '/brand/ticketflow-logo-light.png' },
  icon: { light: '/brand/ticketflow-mark.png', dark: '/brand/ticketflow-mark.png' },
} as const;

export default function Logo({ variant = 'full', theme = 'auto', className = 'h-12' }: LogoProps) {
  const src = SOURCES[variant];
  return (
    <span
      className={clsx('tf-logo', theme === 'dark' && 'on-dark', theme === 'auto' && 'auto', className)}
      role="img"
      aria-label="TicketFlow Kenya"
    >
      <img src={src.light} alt="" className="tf-logo-on-light" draggable={false} />
      <img src={src.dark} alt="" className="tf-logo-on-dark" draggable={false} />
    </span>
  );
}
