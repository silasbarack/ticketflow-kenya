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
    neutral: 'bg-navy-900/[0.055] text-navy-700 ring-navy-900/[0.06]',
    brand: 'bg-brand-50 text-brand-700 ring-brand-600/10',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    warning: 'bg-amber-50 text-amber-800 ring-amber-600/10',
  };

  return (
    <article className="group rounded-card border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-muted">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <p className="tnum mt-2 truncate text-[28px] font-extrabold leading-none tracking-[-0.04em] text-navy-900">
              {value}
            </p>
          )}
          {hint && <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">{hint}</p>}
        </div>
        <span className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
