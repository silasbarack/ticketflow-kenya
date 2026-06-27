'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { EventItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

const GRADIENTS = [
  'from-brand-500 to-rose-500',
  'from-indigo-500 to-brand-500',
  'from-emerald-500 to-teal-600',
  'from-fuchsia-500 to-brand-600',
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash];
}

export default function EventCard({ event }: { event: EventItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const lowestPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : undefined;

  const start = new Date(event.startDateTime);
  const day = start.toLocaleDateString('en-KE', { day: '2-digit' });
  const month = start.toLocaleDateString('en-KE', { month: 'short' });

  const showImage = event.posterUrl && !imageFailed;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden sm:h-52">
        {showImage ? (
          <Image
            src={event.posterUrl as string}
            alt={event.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(event.title)}`}>
            <span className="px-4 text-center text-sm font-semibold text-white/90">{event.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />

        <div className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-white px-2.5 py-1.5 text-center leading-none shadow-sm">
          <span className="text-sm font-bold text-gray-900">{day}</span>
          <span className="text-[10px] font-semibold uppercase text-brand-600">{month}</span>
        </div>

        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur">
          {event.category?.name}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-1 text-base font-semibold text-white drop-shadow-sm">{event.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-white/80">
            {event.venue}, {event.city}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-gray-400">{formatDate(event.startDateTime)}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">
            {lowestPrice !== undefined ? `From ${formatCurrency(lowestPrice)}` : 'Tickets TBA'}
          </p>
        </div>
        <span className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-brand-600">
          Buy Ticket
        </span>
      </div>
    </Link>
  );
}
