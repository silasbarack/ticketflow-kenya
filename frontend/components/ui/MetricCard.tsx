import { type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import Skeleton from '@/components/ui/Skeleton';

export default function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
  loading = false,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning';
  loading?: boolean;
}) {
  const tones = {
    neutral: 'bg-navy-900/[0.055] text-navy-700',
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-800',
  };

  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <p className="tnum mt-1.5 truncate text-2xl font-extrabold tracking-[-0.035em] text-navy-900">
              {value}
            </p>
          )}
          {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
        </div>
        <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-btn', tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
