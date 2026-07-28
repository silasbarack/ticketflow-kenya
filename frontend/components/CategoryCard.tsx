import Link from 'next/link';
import { Drama, Laptop2, Music, PartyPopper, Ticket, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { EventCategory } from '@/types';

const ICONS: Record<string, LucideIcon> = {
  'music & concerts': Music,
  music: Music,
  'tech & business': Laptop2,
  'business & technology': Laptop2,
  sports: Trophy,
  'arts & theatre': Drama,
  'arts & culture': Drama,
  festivals: PartyPopper,
  'food & culture': UtensilsCrossed,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name.toLowerCase()] ?? Ticket;
}

export default function CategoryCard({ category, eventCount }: { category: EventCategory; eventCount?: number }) {
  const Icon = iconFor(category.name);

  return (
    <Link
      href={`/events?category=${category.id}`}
      className="flex snap-start flex-col items-center gap-3 rounded-2xl border border-line bg-white px-5 py-6 text-center shrink-0 w-[136px] transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-card sm:w-auto"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-navy-900">{category.name}</span>
      {typeof eventCount === 'number' && (
        <span className="text-xs text-muted">
          {eventCount} event{eventCount === 1 ? '' : 's'}
        </span>
      )}
    </Link>
  );
}
