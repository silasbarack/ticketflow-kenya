'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BadgeCheck, Calendar, Clock, ExternalLink, Heart, MapPin, Share2, ShieldCheck, Ticket as TicketIcon, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import { EventItem } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import Container from '@/components/ui/Container';
import Badge from '@/components/ui/Badge';
import Button, { buttonVariants } from '@/components/ui/Button';
import EventGrid from '@/components/EventGrid';
import EventPoster from '@/components/EventPoster';
import EventBookingPanel from '@/components/EventBookingPanel';
import { getTierStatus } from '@/lib/tiers';
import Link from 'next/link';

export default function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${params.id}`);
      return data as EventItem;
    },
  });

  const { data: relatedData } = useQuery({
    queryKey: ['related-events', event?.category?.id],
    queryFn: async () => {
      const { data } = await api.get('/events', { params: { categoryId: event!.category.id, take: 6 } });
      return data as { events: EventItem[] };
    },
    enabled: Boolean(event?.category?.id),
  });
  const related = (relatedData?.events ?? []).filter((e) => e.id !== event?.id).slice(0, 3);

  const favorite = event ? isFavorite(event.id) : false;

  async function handleShare() {
    if (!event) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = { title: event.title, text: `${event.title} — ${event.venue}, ${event.city}`, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  if (isLoading) {
    return (
      <Container className="py-16">
        <p className="text-muted">Loading event...</p>
      </Container>
    );
  }
  if (!event) {
    return (
      <Container className="py-16">
        <p className="text-muted">Event not found.</p>
      </Container>
    );
  }

  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  // Absent on older payloads — treat that as bookable so nothing regresses.
  const bookable = event.isBookable !== false && !externalBooking;
  const availableTiers = event.ticketTypes.filter((ticket) => getTierStatus(ticket) === 'AVAILABLE');
  const startingPrice = availableTiers.length
    ? Math.min(...availableTiers.map((ticket) => Number(ticket.price)))
    : null;

  const bookingPanel = <EventBookingPanel event={event} />;

  return (
    <main className="pb-24 lg:pb-16">
      {/* Top section */}
      <div className="border-b border-line bg-white">
        <Container className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* Same artwork as the card, shown larger — cover-cropped, never stretched. */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card bg-ink-900">
            <EventPoster
              src={event.posterUrl}
              alt={event.posterAlt || `${event.title} event poster`}
              // The hero poster is this page's largest contentful paint.
              priority
              sizes="(min-width: 1024px) 62vw, 100vw"
              objectPosition="center 40%"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{event.category?.name}</Badge>
              {(event.organizerName || event.organizer) && (
                <span className="text-sm text-muted">by {event.organizerName || event.organizer?.companyName}</span>
              )}
            </div>

            <h1 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-navy-900 sm:text-[34px]">{event.title}</h1>
            {event.subtitle && <p className="mt-1.5 text-[15px] text-muted">{event.subtitle}</p>}

            <div className="mt-4 space-y-2.5 text-[15px] text-navy-700">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {formatDateTime(event.startDateTime)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {event.venue}, {event.city}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-pressed={favorite}
                onClick={() => {
                  toggleFavorite(event.id);
                  toast.success(favorite ? 'Removed from favourites' : 'Added to favourites', { duration: 1500 });
                }}
              >
                <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                {favorite ? 'Saved' : 'Save'}
              </Button>
            </div>

            {/* Booking panel: desktop position (right column, sticky) */}
            <div id="tickets-desktop" className="mt-6 hidden lg:sticky lg:top-24 lg:block">
              {bookingPanel}
            </div>
          </div>
        </Container>
      </div>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-lg font-bold text-navy-900">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-navy-700">{event.description}</p>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Date &amp; schedule
              </p>
              <p className="mt-2 text-sm text-muted">Starts {formatDateTime(event.startDateTime)}</p>
              <p className="mt-1 text-sm text-muted">Ends {formatDateTime(event.endDateTime)}</p>
            </div>
            <div className="rounded-card border border-line bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Venue
              </p>
              <p className="mt-2 text-sm text-muted">{event.venue}</p>
              <p className="text-sm text-muted">{event.address ? `${event.address}, ` : ''}{event.city}</p>
            </div>
          </section>

          {(event.organizerName || event.organizer) && (
            <section className="rounded-card border border-line bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Users className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Organizer
              </p>
              <p className="mt-2 text-sm font-medium text-navy-800">
                {event.organizerName || event.organizer?.companyName}
              </p>
              {!externalBooking && event.organizer?.description && (
                <p className="mt-1 text-sm text-muted">{event.organizer.description}</p>
              )}
              {/*
                Provenance is stated, but not linked: the verification source is
                the event's other seller, and TicketFlow tickets are bought here.
              */}
              {event.verificationSource && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Event details verified with {event.verificationSource}
                </p>
              )}
            </section>
          )}

          <section className="rounded-card border border-line bg-white p-5 shadow-soft">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {externalBooking ? 'External ticketing' : 'Ticket policy & refunds'}
            </p>
            {externalBooking ? (
              <p className="mt-2 text-sm text-muted">
                Booking, payment, ticket delivery, entry and refund terms are handled by the official seller. Review its terms before purchase.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Tickets are delivered instantly as signed QR codes after payment. For full details on cancellations,
                refunds, and entry requirements, see our{' '}
                <Link href="/legal/ticket-purchase-policy" className="font-medium text-brand-700 underline">
                  Ticket Purchase Policy
                </Link>{' '}
                and{' '}
                <Link href="/legal/payment-policy" className="font-medium text-brand-700 underline">
                  Payment Policy
                </Link>
                .
              </p>
            )}
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-navy-900">Related events</h2>
              <div className="mt-4">
                <EventGrid events={related} isLoading={false} />
              </div>
            </section>
          )}
        </div>

        {/* Booking panel: mobile/tablet position (stacked, in flow) */}
        <div id="tickets-mobile" className="lg:hidden">
          {bookingPanel}
        </div>
      </Container>

      {/* Sticky mobile booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 shadow-elevated backdrop-blur lg:hidden">
        <Container className="flex items-center justify-between gap-3 px-0">
          <div className="min-w-0">
            <p className="text-xs text-muted">{bookable ? 'From' : externalBooking ? 'Official seller' : 'Ticket info'}</p>
            <p className="tnum truncate font-display text-base font-bold text-navy-900">
              {startingPrice != null ? formatCurrency(startingPrice) : 'Sales closed'}
            </p>
          </div>
          {bookable ? (
            <Link href={`/cart?event=${encodeURIComponent(event.slug)}`} className="shrink-0">
              <Button variant="primary">
                <TicketIcon className="h-4 w-4" aria-hidden="true" />
                Book Now
              </Button>
            </Link>
          ) : externalBooking ? (
            <a
              href={event.bookingUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', className: 'shrink-0' })}
            >
              Official seller
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </Container>
      </div>

    </main>
  );
}
