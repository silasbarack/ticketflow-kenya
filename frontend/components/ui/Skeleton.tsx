import clsx from 'clsx';

export default function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-xl bg-navy-900/[0.08]', className)} aria-hidden="true" />;
}

export function EventCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="ref-catalog-grid" role="status" aria-label="Loading events">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-white">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
