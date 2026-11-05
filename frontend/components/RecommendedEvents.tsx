'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Settings2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/format';

interface Recommendation {
  id: string;
  title: string;
  posterUrl: string | null;
  posterAlt: string | null;
  venue: string;
  city: string;
  startDateTime: string;
  category: { name: string };
  reasons: string[];
  minPriceKes: number | null;
}

/**
 * Real, published events only. Signed-out visitors get popularity + timing;
 * signed-in users get personal signals only if they opted in (or set explicit
 * preferences) on /settings/discovery.
 */
export default function RecommendedEvents() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ['recommendations', user?.id ?? 'anon'],
    enabled: !loading,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await api.get<{ personalized: boolean; items: Recommendation[] }>(user ? '/discovery/me/recommendations' : '/discovery/recommendations', { params: { limit: 8 } })).data,
  });

  if (!query.data?.items.length) return null;
  const { personalized, items } = query.data;

  return (
    <section className="mb-8" aria-labelledby="recommended-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="toolbar-label"><Sparkles size={16} /> {personalized ? 'Picked for you' : 'Trending on TicketFlow'}</span>
          <h2 id="recommended-title" className="mt-1 text-xl font-extrabold text-navy-900">{personalized ? 'Recommended for you' : 'Popular and coming up soon'}</h2>
        </div>
        {user && (
          <Link href="/settings/discovery" className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-600 hover:text-brand-700">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />{personalized ? 'Why these? Manage preferences' : 'Personalise'}
          </Link>
        )}
      </div>
      <ul className="snap-row gap-3 pb-2">
        {items.map((e) => (
          <li key={e.id} className="w-[240px] shrink-0">
            <Link href={`/events/${e.id}`} className="block overflow-hidden rounded-card border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
              <div className="aspect-[4/3] bg-navy-900/5">
                {e.posterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.posterUrl} alt={e.posterAlt || e.title} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">{e.category.name}</p>
                <p className="mt-1 line-clamp-2 text-sm font-extrabold text-navy-900">{e.title}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(e.startDateTime)} · {e.city}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {e.minPriceKes !== null && <span className="text-xs font-bold text-navy-800">From {formatCurrency(e.minPriceKes)}</span>}
                  {e.reasons.slice(0, 1).map((r) => <span key={r} className="rounded-full bg-navy-900/5 px-2 py-0.5 text-xs font-semibold text-navy-600">{r}</span>)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
