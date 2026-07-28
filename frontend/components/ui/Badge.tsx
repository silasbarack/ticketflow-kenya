import { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'brand' | 'accent' | 'navy' | 'neutral' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  navy: 'bg-navy-900 text-white',
  neutral: 'bg-navy-900/5 text-navy-700',
  success: 'bg-brand-50 text-brand-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-accent-50 text-accent-700',
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
