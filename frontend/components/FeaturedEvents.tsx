'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import EventGrid from '@/components/EventGrid';
import Container from '@/components/ui/Container';

export default function FeaturedEvents() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['featured-events'],
    queryFn: async () => {
      const { data } = await api.get('/events', { params: { take: 24 } });
      return data as { events: EventItem[]; total: number };
    },
  });

  const allEvents = data?.events ?? [];
  const featured = allEvents.filter((e) => e.isFeatured);
  // Fall back to the soonest upcoming events so the homepage never shows an
  // empty section before any event has been marked featured.
  const events = (featured.length > 0 ? featured : allEvents).slice(0, 6);

  return (
    <section className="bg-surface py-14 sm:py-20" aria-labelledby="featured-events-heading">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              {featured.length > 0 ? 'Handpicked for you' : 'Coming up'}
            </p>
            <h2 id="featured-events-heading" className="mt-1.5 text-[28px] font-bold text-navy-900 sm:text-3xl">
              Popular events near you
            </h2>
          </div>
          <Link href="/events" className="hidden items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex">
            View all events
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <EventGrid
          events={events}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyTitle="No events published yet"
          emptyDescription="Check back soon — new events are added regularly."
        />

        <div className="mt-8 flex justify-center sm:hidden">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            View all events
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
