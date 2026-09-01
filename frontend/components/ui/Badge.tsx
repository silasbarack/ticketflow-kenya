import { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'brand' | 'accent' | 'navy' | 'neutral' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-100',
  navy: 'bg-ink-900 text-white',
  neutral: 'bg-navy-900/[0.06] text-navy-700',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100',
  danger: 'bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-100',
};

export default function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
