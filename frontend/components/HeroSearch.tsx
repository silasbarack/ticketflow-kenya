'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Search } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function HeroSearch() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (city.trim()) params.set('city', city.trim());
    if (date) params.set('fromDate', date);
    router.push(`/events${params.size ? `?${params}` : ''}`);
  }
  return (
    <form onSubmit={submit} aria-label="Find an event" className="discovery-search">
      <label className="discovery-search-field sm:col-span-2 lg:col-span-1"><Search aria-hidden="true" /><span><span className="discovery-search-label">What are you looking for?</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Event, artist or venue" /></span></label>
      <label className="discovery-search-field"><MapPin aria-hidden="true" /><span><span className="discovery-search-label">Where</span><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Anywhere in Kenya" /></span></label>
      <label className="discovery-search-field"><CalendarDays aria-hidden="true" /><span><span className="discovery-search-label">When</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></span></label>
      <Button type="submit" className="m-2 sm:col-span-2 lg:col-span-1 lg:m-3">Search events <Search className="h-4 w-4" aria-hidden="true" /></Button>
    </form>
  );
}
