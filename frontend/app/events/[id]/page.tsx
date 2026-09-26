import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { EventItem } from '@/types';
import EventDetailClient from './EventDetailClient';

async function getEvent(idOrSlug: string): Promise<EventItem | null> {
  try {
    const response = await fetch(API_URL + '/events/' + encodeURIComponent(idOrSlug), { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return await response.json() as EventItem;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);
  if (!event) return { title: 'Event not found | TicketFlow Kenya' };
  return {
    title: event.title + ' | TicketFlow Kenya',
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 160),
      images: event.posterUrl ? [event.posterUrl] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  return <EventDetailClient initialEvent={event} />;
}
