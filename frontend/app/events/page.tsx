'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import { getCuratedUpcoming } from '@/lib/curated-events';
import EventGrid from '@/components/EventGrid';

const categoryOptions = ['all', 'music', 'sports', 'nightlife', 'culture', 'festival', 'technology', 'entertainment', 'motoring'];

export default function EventsPage() {
  const params = useSearchParams();
  const q = (params.get('q') || '').trim().toLowerCase();
  const city = (params.get('city') || '').trim().toLowerCase();
  const category = (params.get('category') || 'all').trim().toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ['events-fresh-ui'],
    queryFn: async () => (await api.get('/events', { params: { take: 100 } })).data as { events: EventItem[]; total: number },
  });

  const events = useMemo(() => {
    const curated = getCuratedUpcoming();
    const live = (data?.events || []).filter((event) => Date.parse(event.endDateTime) >= Date.now());
    const known = new Set(curated.map((event) => event.slug));
    return [...curated, ...live.filter((event) => !known.has(event.slug))]
      .filter((event) => {
        const haystack = [event.title, event.subtitle, event.venue, event.city, event.category.name].filter(Boolean).join(' ').toLowerCase();
        const matchQ = !q || haystack.includes(q);
        const matchCity = !city || event.city.toLowerCase() === city;
        const matchCategory = category === 'all' || event.category.slug.toLowerCase().includes(category) || event.category.name.toLowerCase().includes(category);
        return matchQ && matchCity && matchCategory;
      })
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }, [data, q, city, category]);

  return (
    <main className="events-page">
      <section className="events-page-hero">
        <div className="container-page">
          <span className="section-eyebrow light">TicketFlow calendar</span>
          <h1>Find something worth showing up for.</h1>
          <p>Upcoming events across Kenya, ordered by date and designed to browse cleanly on any screen.</p>
          <form className="events-search" action="/events">
            <label><Search size={18} /><input name="q" defaultValue={params.get('q') || ''} placeholder="Search events, artists or venues" /></label>
            <label><MapPin size={18} /><select name="city" defaultValue={params.get('city') || ''}><option value="">All cities</option><option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Eldoret</option><option>Thika</option></select></label>
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="events-results">
        <div className="container-page">
          <div className="events-toolbar">
            <div>
              <span className="toolbar-label"><CalendarDays size={16} /> Upcoming calendar</span>
              <h2>{events.length} {events.length === 1 ? 'event' : 'events'} found</h2>
            </div>
            <span className="toolbar-mobile-label"><SlidersHorizontal size={16} /> Filters</span>
          </div>

          <div className="filter-scroll" aria-label="Category filters">
            {categoryOptions.map((item) => {
              const search = new URLSearchParams();
              if (params.get('q')) search.set('q', params.get('q') || '');
              if (params.get('city')) search.set('city', params.get('city') || '');
              if (item !== 'all') search.set('category', item);
              const href = '/events' + (search.toString() ? '?' + search.toString() : '');
              return <a key={item} href={href} className={category === item ? 'active' : ''}>{item === 'all' ? 'All events' : item}</a>;
            })}
          </div>

          <EventGrid
            events={events}
            isLoading={isLoading && events.length === 0}
            emptyTitle="No events match those filters"
            emptyDescription="Try a broader search or clear one of the filters."
          />
        </div>
      </section>
    </main>
  );
}
