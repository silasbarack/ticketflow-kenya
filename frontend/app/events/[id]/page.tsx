import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { EventItem } from '@/types';
import EventDetailClient from './EventDetailClient';

async function getEvent(idOrSlug: string): Promise<EventItem | null> {
  try {
    const res = await fetch(`${API_URL}/events/${idOrSlug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as EventItem;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);

  if (!event) {
    return { title: 'Event not found | TicketFlow Kenya' };
  }

  const title = `${event.title} | TicketFlow Kenya`;
  const description =
    event.description?.slice(0, 160) || `Get tickets for ${event.title} at ${event.venue}, ${event.city}.`;
  const images = event.posterUrl ? [{ url: event.posterUrl, width: 1080, height: 1080, alt: event.title }] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.posterUrl ? [event.posterUrl] : undefined,
    },
  };
}

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);

  const jsonLd = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: event.description,
        startDate: event.startDateTime,
        endDate: event.endDateTime,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        image: event.posterUrl ? [event.posterUrl] : undefined,
        location: {
          '@type': 'Place',
          name: event.venue,
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.address || event.venue,
            addressLocality: event.city,
            addressCountry: 'KE',
          },
        },
        organizer: event.organizer
          ? { '@type': 'Organization', name: event.organizer.companyName }
          : { '@type': 'Organization', name: 'TicketFlow Kenya' },
        offers: event.ticketTypes.map((tt) => ({
          '@type': 'Offer',
          name: tt.name,
          price: tt.price,
          priceCurrency: 'KES',
          availability:
            tt.quantity - tt.quantitySold > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          url: `https://ticketflow-frontend-w47s.onrender.com/events/${event.slug}`,
        })),
      }
    : null;

  return (
    <>
      {jsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <EventDetailClient />
    </>
  );
}
