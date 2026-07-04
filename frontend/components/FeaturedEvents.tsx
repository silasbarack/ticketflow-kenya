'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import EventPosterCard from './EventPosterCard';

export default function FeaturedEvents() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-events'],
    queryFn: async () => {
      const { data } = await api.get('/events', { params: { take: 50 } });
      return data as { events: EventItem[]; total: number };
    },
  });

  const featured = (data?.events ?? []).filter((e) => e.isFeatured);

  if (!isLoading && featured.length === 0) return null;

  return (
    <section className="bg-gray-50 py-12" aria-labelledby="featured-events-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              TicketFlow Kenya presents
            </p>
            <h2 id="featured-events-heading" className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              Featured Events
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/5] animate-pulse rounded-[18px] bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((event) => (
              <EventPosterCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
