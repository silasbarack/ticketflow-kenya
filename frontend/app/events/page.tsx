'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { EventItem } from '@/types';
import EventGrid from '@/components/EventGrid';

const categoryOptions = ['all', 'music', 'sports', 'nightlife', 'culture', 'festival', 'technology', 'entertainment', 'motoring'];

const DAY = 24 * 60 * 60 * 1000;

/** `date` filter from the home-page search: today / weekend / month (next 30 days). */
function inDateWindow(event: EventItem, range: string) {
  if (!range) return true;
  const start = Date.parse(event.startDateTime);
  const end = Date.parse(event.endDateTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let from = today;
  let to = today + DAY;
  if (range === 'weekend') {
    const day = now.getDay(); // 0 = Sunday … 5 = Friday
    // Friday → Sunday: during the weekend, count back to its Friday.
    from = day === 5 || day === 6 || day === 0 ? today - ((day + 2) % 7) * DAY : today + (5 - day) * DAY;
    to = from + 3 * DAY;
  } else if (range === 'month') {
    to = today + 30 * DAY;
  } else if (range !== 'today') {
    return true;
  }
  return start < to && end >= from;
}

export default function EventsPage() {
  // useSearchParams() needs a Suspense boundary or the page cannot be prerendered.
  return (
    <Suspense fallback={null}>
      <EventsCatalog />
    </Suspense>
  );
}

function EventsCatalog() {
  const params = useSearchParams();
  const q = (params.get('q') || '').trim().toLowerCase();
  const city = (params.get('city') || '').trim().toLowerCase();
  const category = (params.get('category') || 'all').trim().toLowerCase();
  const date = (params.get('date') || '').trim().toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ['events-fresh-ui'],
    queryFn: async () => (await api.get('/events', { params: { take: 100 } })).data as { events: EventItem[]; total: number },
  });

  const events = useMemo(() => {
    return (data?.events || [])
      .filter((event) => Date.parse(event.endDateTime) >= Date.now())
      .filter((event) => {
        const haystack = [event.title, event.subtitle, event.venue, event.city, event.category.name].filter(Boolean).join(' ').toLowerCase();
        const matchQ = !q || haystack.includes(q);
        const matchCity = !city || event.city.toLowerCase() === city;
        const matchCategory = category === 'all' || event.category.slug.toLowerCase().includes(category) || event.category.name.toLowerCase().includes(category);
        return matchQ && matchCity && matchCategory && inDateWindow(event, date);
      })
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }, [data, q, city, category, date]);

  return (
    <main className="events-page">
      <section className="events-page-hero">
        <div className="container-page">
          <span className="section-eyebrow light tf-rise">Discover · TicketFlow Kenya</span>
          <h1 className="tf-rise" style={{ '--d': '80ms' } as React.CSSProperties}>Find something worth <span className="text-brand-500">showing up</span> for.</h1>
          <p className="tf-rise" style={{ '--d': '160ms' } as React.CSSProperties}>Concerts, festivals, theatre, sports and more across Kenya — pay with M-Pesa and get your QR ticket instantly.</p>
          <form className="events-search tf-rise" style={{ '--d': '240ms' } as React.CSSProperties} action="/events">
            <label><Search size={18} /><input name="q" defaultValue={params.get('q') || ''} placeholder="Search events, artists or venues" /></label>
            <label><MapPin size={18} /><select name="city" defaultValue={params.get('city') || ''}><option value="">All cities</option><option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Eldoret</option><option>Thika</option></select></label>
            {params.get('category') && <input type="hidden" name="category" value={params.get('category') || ''} />}
            {params.get('date') && <input type="hidden" name="date" value={params.get('date') || ''} />}
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
              if (params.get('date')) search.set('date', params.get('date') || '');
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
