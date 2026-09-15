'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Search } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function HeroSearch() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (city.trim()) params.set('city', city.trim());
    if (date) params.set('fromDate', date);
    router.push(`/events${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-panel border border-white/15 bg-white p-2.5 shadow-elevated transition-shadow sm:flex-row sm:items-center sm:gap-1 sm:rounded-full sm:p-2"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-3.5 py-2.5 sm:border-r sm:border-line">
        <Search className="h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
        <span className="sr-only">Event name or keyword</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
          placeholder="Event, artist, or venue"
          className="h-8 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] text-navy-900 placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </label>

      <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-3.5 py-2.5 sm:border-r sm:border-line">
        <MapPin className="h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
        <span className="sr-only">City or location</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          type="text"
          placeholder="Nairobi, Mombasa..."
          className="h-8 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] text-navy-900 placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </label>

      <label className="flex min-w-0 items-center gap-2.5 rounded-full px-3.5 py-2.5 sm:flex-1">
        <Calendar className="h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
        <span className="sr-only">Date</span>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="h-8 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] text-navy-900 placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </label>

      <Button type="submit" size="md" className="w-full shrink-0 sm:w-auto">
        Search
      </Button>
    </form>
  );
}
