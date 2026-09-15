'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BadgeCheck, Calendar, CalendarX, Clock, ExternalLink, Heart, MapPin, Share2, ShieldCheck, Ticket as TicketIcon, Users } from 'lucide-react';
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
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { getTierStatus } from '@/lib/tiers';
import Link from 'next/link';

export default function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: event, isLoading, isError, refetch } = useQuery({
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
      <Container className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="aspect-[16/10] rounded-card" />
        <div className="space-y-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-10 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="mt-8 h-72 rounded-card" /></div>
      </Container>
    );
  }
  if (isError || !event) {
    return (
      <Container className="max-w-2xl py-16">
        <EmptyState
          icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
          title={isError ? "We couldn't load this event" : 'Event not found'}
          description={isError ? 'Check your connection and try again.' : 'The event may have ended or the link may be incorrect.'}
          action={isError ? <Button onClick={() => refetch()}>Try again</Button> : <Link href="/events" className={buttonVariants()}>Browse events</Link>}
        />
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
    <main className="bg-white pb-24 lg:pb-12">
      <Container className="py-5">
        <Link href="/events" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-brand-700">&larr; All experiences</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><Badge tone="brand">{event.category?.name}</Badge><span className="text-sm text-muted">{event.city}</span></div>
        <h1 className="mt-4 max-w-4xl text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-navy-900 sm:text-[40px]">{event.title}</h1>
        {event.subtitle && <p className="mt-3 text-base text-muted">{event.subtitle}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-sm text-muted"><Calendar className="h-4 w-4 text-brand-600" aria-hidden="true" />{formatDateTime(event.startDateTime)}</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleShare}><Share2 className="h-4 w-4" aria-hidden="true" />Share</Button><Button variant="outline" size="sm" aria-pressed={favorite} onClick={() => {toggleFavorite(event.id); toast.success(favorite ? 'Removed from favourites' : 'Added to favourites');}}><Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />{favorite ? 'Saved' : 'Save'}</Button></div>
        </div>
      </Container>
      <Container className="grid grid-cols-1 items-start gap-8 pb-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-panel bg-surface">
            <EventPoster src={event.posterUrl} alt={event.posterAlt || event.title} priority sizes="(min-width: 1024px) 60vw, 100vw" fit="contain" />
          </div>
          <div className="mt-7 grid gap-5 border-y border-line py-6 sm:grid-cols-2">
            <div className="flex gap-3"><Clock className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" /><div><h2 className="text-sm font-bold text-navy-900">Date & time</h2><p className="mt-2 text-sm text-muted">{formatDateTime(event.startDateTime)}</p><p className="mt-1 text-xs text-muted">Until {formatDateTime(event.endDateTime)}</p></div></div>
            <div className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" /><div><h2 className="text-sm font-bold text-navy-900">Location</h2><p className="mt-2 text-sm text-muted">{event.venue}</p><p className="mt-1 text-xs text-muted">{event.address ? event.address + ', ' : ''}{event.city}</p></div></div>
          </div>
          <section className="py-7"><h2 className="text-xl font-bold tracking-tight text-navy-900">The experience</h2><p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-navy-700">{event.description}</p></section>
          {(event.organizerName || event.organizer) && <section className="flex gap-4 rounded-card border border-line bg-cream p-5"><Users className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" /><div><p className="text-xs text-muted">Brought to you by</p><h2 className="mt-1 font-bold text-navy-900">{event.organizerName || event.organizer?.companyName}</h2>{!externalBooking && event.organizer?.description && <p className="mt-2 text-sm text-muted">{event.organizer.description}</p>}{event.verificationSource && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><BadgeCheck className="h-4 w-4" aria-hidden="true" />Details verified with {event.verificationSource}</p>}</div></section>}
          <section className="mt-6 border-t border-line py-6"><h2 className="flex items-center gap-2 text-sm font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />Before you book</h2><p className="mt-3 text-sm leading-relaxed text-muted">{externalBooking ? 'Booking, payment, ticket delivery and refunds are handled by the official seller. Review their terms before purchasing.' : <>Your QR ticket is available after payment confirmation. See our <Link href="/legal/ticket-purchase-policy" className="text-brand-700 underline">ticket purchase policy</Link> and <Link href="/legal/payment-policy" className="text-brand-700 underline">payment policy</Link> for entry and refund information.</>}</p></section>
        </div>
        <aside id="tickets" className="min-w-0 scroll-mt-24 lg:sticky lg:top-24">{bookingPanel}</aside>
      </Container>
      {related.length > 0 && <section className="border-t border-line bg-cream py-9"><Container><h2 className="marketplace-heading mb-6">Keep exploring</h2><EventGrid events={related} /></Container></section>}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 lg:hidden">
        <Container className="flex items-center justify-between gap-3 px-0">
          <div className="min-w-0"><p className="text-xs text-muted">{bookable ? 'Tickets from' : 'Ticket information'}</p><p className="tnum text-base font-bold text-navy-900">{startingPrice !== null ? formatCurrency(startingPrice) : 'Sales closed'}</p></div>
          {bookable ? <Link href={`/cart?event=${encodeURIComponent(event.slug)}`} className={buttonVariants({className:'shrink-0'})}><TicketIcon className="h-4 w-4" aria-hidden="true" />Choose tickets</Link> : externalBooking ? <a href={event.bookingUrl as string} target="_blank" rel="noopener noreferrer" className={buttonVariants({variant:'outline'})}>Official seller <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
        </Container>
      </div>
    </main>
  );
}
