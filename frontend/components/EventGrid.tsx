'use client';

import { CalendarSearch } from 'lucide-react';
import { EventItem } from '@/types';
import EventCard from '@/components/EventCard';
import { EventCardSkeletonGrid } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

export default function EventGrid({
  events,
  isLoading,
  isError,
  onRetry,
  emptyTitle = 'No events found',
  emptyDescription = 'Try adjusting your search or check back soon for new listings.',
  skeletonCount = 6,
}: {
  events: EventItem[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonCount?: number;
}) {
  if (isLoading) return <EventCardSkeletonGrid count={skeletonCount} />;

  if (isError) return <ErrorState title="Couldn't load events" onRetry={onRetry} />;

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarSearch className="h-6 w-6" aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
