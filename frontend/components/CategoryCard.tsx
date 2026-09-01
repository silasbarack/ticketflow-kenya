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
      className="group flex w-[136px] shrink-0 snap-start flex-col gap-3 rounded-card border border-line bg-white px-4 py-5 transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card sm:w-auto"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-navy-900">{category.name}</span>
        {typeof eventCount === 'number' && (
          <span className="tnum mt-0.5 block text-xs text-muted">
            {eventCount} event{eventCount === 1 ? '' : 's'}
          </span>
        )}
      </span>
    </Link>
  );
}
