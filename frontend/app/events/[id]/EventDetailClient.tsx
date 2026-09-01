'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, Clock, ExternalLink, Heart, MapPin, Share2, ShieldCheck, Ticket as TicketIcon, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { EventItem } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import Container from '@/components/ui/Container';
import Badge from '@/components/ui/Badge';
import Button, { buttonVariants } from '@/components/ui/Button';
import EventGrid from '@/components/EventGrid';
import EventPoster from '@/components/EventPoster';
import TicketTierSelector from '@/components/TicketTierSelector';
import BookingSummary from '@/components/BookingSummary';
import Link from 'next/link';

function getTierStatus(ticket: EventItem['ticketTypes'][number]) {
  if (ticket.availabilityStatus === 'AVAILABLE' && ticket.salesEnd && new Date(ticket.salesEnd).getTime() < Date.now()) {
    return 'CLOSED';
  }
  if (ticket.availabilityStatus) return ticket.availabilityStatus;
  return ticket.quantity - ticket.quantitySold > 0 ? 'AVAILABLE' : 'SOLD_OUT';
}

export default function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, addToCart, totalItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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

  const total = useMemo(() => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, tt) => sum + (quantities[tt.id] || 0) * Number(tt.price), 0);
  }, [event, quantities]);

  const totalSelected = useMemo(() => Object.values(quantities).reduce((s, q) => s + q, 0), [quantities]);

  const cartEventId = cartItems[0]?.eventId;
  const cartEventName = cartItems[0]?.eventTitle;
  const willReplaceCart = cartItems.length > 0 && cartEventId !== event?.id;
  const favorite = event ? isFavorite(event.id) : false;

  function scrollToTicketSelector() {
    // Two copies of the booking panel exist in the DOM (desktop sticky
    // column vs. mobile stacked position) — only one is ever visible at a
    // given viewport width, so target whichever isn't display:none.
    const candidates = document.querySelectorAll('#tickets-desktop, #tickets-mobile');
    for (const el of Array.from(candidates)) {
      if ((el as HTMLElement).offsetParent !== null) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  function handleAddToCart() {
    if (totalSelected <= 0) {
      scrollToTicketSelector();
      toast.error('Select at least one ticket');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customer accounts can purchase tickets');
      return;
    }
    if (willReplaceCart) {
      if (!confirm(`Your cart currently has tickets for "${cartEventName}". Adding these will replace your cart. Continue?`)) {
        return;
      }
    }

    let added = 0;
    for (const tt of event!.ticketTypes) {
      const qty = quantities[tt.id] || 0;
      if (qty > 0) {
        addToCart({
          eventId: event!.id,
          eventTitle: event!.title,
          eventSlug: event!.slug,
          eventDateTime: event!.startDateTime,
          eventVenue: event!.venue,
          eventCity: event!.city,
          ticketTypeId: tt.id,
          ticketTypeName: tt.name,
          ticketTypeCategory: tt.category,
          price: Number(tt.price),
          quantity: qty,
        });
        added += qty;
      }
    }

    setQuantities({});
    toast.success(`${added} ticket${added !== 1 ? 's' : ''} added to cart`, { icon: '🛒', duration: 3000 });
  }

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

  // Absent on older payloads — treat that as bookable so nothing regresses.
  const bookable = event.isBookable !== false;
  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  const availableTiers = event.ticketTypes.filter((ticket) => getTierStatus(ticket) === 'AVAILABLE');
  const startingPrice = availableTiers.length
    ? Math.min(...availableTiers.map((ticket) => Number(ticket.price)))
    : null;

  const bookingPanel = (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="scroll-mt-24 text-lg font-bold text-navy-900">
        {bookable ? 'Select Tickets' : externalBooking ? 'Official tickets' : 'Ticket information'}
      </h2>

      {bookable ? (
        <>
          <div className="mt-4">
            <TicketTierSelector
              ticketTypes={event.ticketTypes}
              quantities={quantities}
              onChange={(id, qty) => setQuantities((q) => ({ ...q, [id]: qty }))}
            />
          </div>
          <BookingSummary subtotal={total} totalSelected={totalSelected} onAddToCart={handleAddToCart} cartCount={totalItems} />
        </>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-navy-900">Not on sale through TicketFlow Kenya</p>
            <p className="mt-1.5 text-sm text-muted">
              {event.organizerName
                ? `Tickets for this event are sold by ${event.organizerName} through its authorised channel.`
                : 'Tickets for this event are sold by the organizer through their own channels.'}{' '}
              TicketFlow does not take payment for this listing.
            </p>
          </div>
          {event.ticketTypes.length > 0 && (
            <ul className="space-y-2">
              {[...event.ticketTypes]
                .sort((a, b) => Number(a.price) - Number(b.price))
                .map((tt) => {
                  const status = getTierStatus(tt);
                  return (
                    <li key={tt.id} className={`rounded-xl border border-line px-4 py-3 ${status === 'AVAILABLE' ? '' : 'bg-surface opacity-70'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-navy-900">{tt.name}</span>
                        <span className="shrink-0 text-sm font-bold text-navy-900">{formatCurrency(Number(tt.price))}</span>
                      </div>
                      {(tt.description || status !== 'AVAILABLE') && (
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                          <span>{tt.description}</span>
                          {status !== 'AVAILABLE' && (
                            <span className="font-bold uppercase text-brand-700">
                              {status === 'SOLD_OUT' ? 'Sold out' : status === 'CLOSED' ? 'Closed' : 'Not on sale'}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
          {externalBooking && (
            <a
              href={event.bookingUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'primary', size: 'lg', fullWidth: true })}
            >
              Book Now with the official seller
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );

  return (
    <main className="pb-24 lg:pb-16">
      {/* Top section */}
      <div className="border-b border-line bg-white">
        <Container className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* Same artwork as the card, shown larger — cover-cropped, never stretched. */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-navy-900">
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

            <h1 className="mt-3 text-[26px] font-bold leading-tight text-navy-900 sm:text-[32px]">{event.title}</h1>
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
            <h2 className="text-lg font-bold text-navy-900">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-navy-700">{event.description}</p>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Date &amp; schedule
              </p>
              <p className="mt-2 text-sm text-muted">Starts {formatDateTime(event.startDateTime)}</p>
              <p className="mt-1 text-sm text-muted">Ends {formatDateTime(event.endDateTime)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Venue
              </p>
              <p className="mt-2 text-sm text-muted">{event.venue}</p>
              <p className="text-sm text-muted">{event.address ? `${event.address}, ` : ''}{event.city}</p>
            </div>
          </section>

          {(event.organizerName || event.organizer) && (
            <section className="rounded-2xl border border-line bg-white p-5">
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
              {event.verificationSourceUrl && (
                <a
                  href={event.verificationSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Event details verified with {event.verificationSource || 'the official source'}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-line bg-white p-5">
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
              <h2 className="text-lg font-bold text-navy-900">Related events</h2>
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
            <p className="text-xs text-muted">
              {externalBooking
                ? 'Official seller'
                : totalSelected > 0
                  ? `${totalSelected} ticket${totalSelected !== 1 ? 's' : ''} selected`
                  : 'From'}
            </p>
            <p className="truncate text-base font-bold text-navy-900">
              {startingPrice != null ? `KES ${startingPrice.toLocaleString()}` : 'Sales closed'}
            </p>
          </div>
          {externalBooking ? (
            <a
              href={event.bookingUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'primary', className: 'shrink-0' })}
            >
              Book Now
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <Button variant="primary" onClick={handleAddToCart} className="shrink-0">
              <TicketIcon className="h-4 w-4" aria-hidden="true" />
              {totalSelected > 0 ? 'Add to Cart' : 'Select Tickets'}
            </Button>
          )}
        </Container>
      </div>
    </main>
  );
}
