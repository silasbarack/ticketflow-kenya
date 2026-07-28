'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCategory, EventItem } from '@/types';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import EventGrid from '@/components/EventGrid';
import EventSort, { SortOption } from '@/components/EventSort';
import { EMPTY_FILTERS, EventFilterFields, EventFilterSheet, EventFiltersValue, hasActiveFilters } from '@/components/EventFilters';

function sortEvents(events: EventItem[], sort: SortOption): EventItem[] {
  const withPrice = (e: EventItem) => (e.ticketTypes.length ? Math.min(...e.ticketTypes.map((t) => Number(t.price))) : Infinity);
  const copy = [...events];
  switch (sort) {
    case 'soonest':
      return copy.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt ?? b.startDateTime).getTime() - new Date(a.createdAt ?? a.startDateTime).getTime());
    case 'price-asc':
      return copy.sort((a, b) => withPrice(a) - withPrice(b));
    case 'price-desc':
      return copy.sort((a, b) => withPrice(b) - withPrice(a));
    default:
      return copy;
  }
}

function EventsContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<EventFiltersValue>({
    ...EMPTY_FILTERS,
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    fromDate: searchParams.get('fromDate') || '',
  });
  const [sort, setSort] = useState<SortOption>('recommended');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data as EventCategory[];
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const { data } = await api.get('/events', {
        params: {
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          city: filters.city || undefined,
          fromDate: filters.fromDate || undefined,
          minPrice: filters.freeOnly ? '0' : filters.minPrice || undefined,
          maxPrice: filters.freeOnly ? '0' : filters.maxPrice || undefined,
          take: 60,
        },
      });
      return data.events as EventItem[];
    },
  });

  const filtered = useMemo(() => {
    let events = data ?? [];
    if (filters.availableOnly) {
      events = events.filter((e) => e.ticketTypes.some((t) => t.quantity - t.quantitySold > 0));
    }
    return sortEvents(events, sort);
  }, [data, filters.availableOnly, sort]);

  const activeCategory = categories?.find((c) => c.id === filters.categoryId);
  const filtersActive = hasActiveFilters(filters);

  return (
    <main>
      <div className="border-b border-line bg-white py-8 sm:py-10">
        <Container>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            {activeCategory ? activeCategory.name : 'All events'}
          </p>
          <h1 className="mt-1 text-[28px] font-bold text-navy-900 sm:text-3xl">Browse Events</h1>
          <p className="mt-1.5 text-muted">Find concerts, conferences, sports, and festivals happening near you.</p>

          <div className="mt-6">
            <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line bg-white px-3.5 shadow-soft">
              <Search className="h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
              <span className="sr-only">Search events</span>
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                type="search"
                placeholder="Search by event, artist, or venue..."
                className="h-full w-full border-0 bg-transparent p-0 text-[15px] text-navy-900 placeholder:text-muted focus:outline-none focus:ring-0"
              />
            </label>
          </div>

          {/* Desktop filter row */}
          <div className="mt-4 hidden lg:block">
            <EventFilterFields filters={filters} onChange={setFilters} categories={categories} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
            <EventSort value={sort} onChange={setSort} />
            {filtersActive && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-auto flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {!isLoading && filtered && (
          <p className="mb-5 text-sm text-muted">
            {filtered.length} event{filtered.length === 1 ? '' : 's'} found
          </p>
        )}
        <EventGrid events={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />
      </Container>

      <EventFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        categories={categories}
        resultCount={filtered?.length}
      />
    </main>
  );
}

export default function EventsPage() {
  return (
    <Suspense>
      <EventsContent />
    </Suspense>
  );
}
