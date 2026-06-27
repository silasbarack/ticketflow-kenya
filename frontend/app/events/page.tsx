'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import EventCard from '@/components/EventCard';
import { EventCategory, EventItem } from '@/types';

function EventsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [fromDate, setFromDate] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data as EventCategory[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['events', { search, categoryId, city, minPrice, maxPrice, fromDate }],
    queryFn: async () => {
      const { data } = await api.get('/events', {
        params: {
          search: search || undefined,
          categoryId: categoryId || undefined,
          city: city || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          fromDate: fromDate || undefined,
          take: 50,
        },
      });
      return data.events as EventItem[];
    },
  });

  const activeCategory = categories?.find((c) => c.id === categoryId);
  const hasActiveFilters = search || categoryId || city || minPrice || maxPrice || fromDate;

  function clearFilters() {
    setSearch('');
    setCategoryId('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setFromDate('');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {activeCategory ? activeCategory.name : 'All events'}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Browse Events</h1>
      <p className="mt-1 text-gray-500">Find concerts, conferences, sports, and festivals happening near you.</p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none lg:col-span-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min KES"
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max KES"
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={clearFilters} className="mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700">
          Clear filters &times;
        </button>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
            <p className="text-4xl">{'\u{1F50D}'}</p>
            <p className="mt-3 font-medium text-gray-600">No events match your filters.</p>
            <p className="text-sm text-gray-400">Try widening your search or clearing filters.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">{data.length} event{data.length === 1 ? '' : 's'} found</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
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
