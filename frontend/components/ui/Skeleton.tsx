import clsx from 'clsx';

export default function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-xl bg-navy-900/8', className)} aria-hidden="true" />;
}

/** Grid of card-shaped skeletons, sized to match EventCard. */
export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading events"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
