'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { SERVICE_FEE_PERCENT, serviceFeeFor } from '@/lib/fees';
import { TIER_TINT_COLORS, getTierStatus, sortTiers, tierLabel } from '@/lib/tiers';
import { TicketTypeCategory } from '@/types';
import Button, { buttonVariants } from '@/components/ui/Button';

const STATUS_COPY: Record<string, string> = {
  SOLD_OUT: 'Sold out',
  CLOSED: 'Sales closed',
  NOT_YET_ON_SALE: 'Not yet on sale',
};

/**
 * The event page shows the tier ladder but does not sell from it — Book Now
 * hands the buyer to /cart, which is the single place a tier is chosen. That
 * keeps one selection surface instead of two that can disagree.
 */
export default function EventBookingPanel({ event }: { event: EventItem }) {
  const externalBooking = event.bookingMode === 'EXTERNAL' && Boolean(event.bookingUrl);
  const bookable = event.isBookable !== false && !externalBooking;

  const tiers = sortTiers(event.ticketTypes);
  const availableTiers = tiers.filter((t) => getTierStatus(t) === 'AVAILABLE');
  const fromPrice = availableTiers.length ? Math.min(...availableTiers.map((t) => Number(t.price))) : null;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="border-b border-line px-5 py-4">
        <p className="eyebrow text-brand-700">{bookable ? 'Book your tickets' : 'Ticket information'}</p>
        {fromPrice != null ? (
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xs text-muted">From</span>
            <span className="tnum text-2xl font-extrabold text-navy-900">{formatCurrency(fromPrice)}</span>
            <span className="text-xs text-muted">+ {SERVICE_FEE_PERCENT}% fee</span>
          </p>
        ) : (
          <p className="mt-1.5 text-lg font-bold text-navy-900">
            {tiers.length > 0 ? 'Sales closed' : 'Tickets to be announced'}
          </p>
        )}
      </div>

      {tiers.length > 0 && (
        <ul className="divide-y divide-line">
          {tiers.map((tt) => {
            const status = getTierStatus(tt);
            const face = Number(tt.price);
            const tint = TIER_TINT_COLORS[tt.category as TicketTypeCategory] ?? 'bg-navy-900/5 text-navy-700 ring-navy-200';

            return (
              <li key={tt.id} className={`flex items-start justify-between gap-3 px-5 py-3.5 ${status === 'AVAILABLE' ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <span className={`eyebrow inline-flex rounded-full px-2 py-1 ring-1 ring-inset ${tint}`}>
                    {tierLabel(tt.category)}
                  </span>
                  <p className="mt-1.5 truncate text-sm font-semibold text-navy-900">{tt.name}</p>
                  {status !== 'AVAILABLE' && (
                    <p className="text-xs font-semibold text-accent-700">
                      {status === 'NOT_YET_ON_SALE' && tt.salesStart
                        ? `On sale from ${formatDate(tt.salesStart)}`
                        : STATUS_COPY[status] ?? 'Unavailable'}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-sm font-bold text-navy-900">{formatCurrency(face)}</p>
                  {bookable && (
                    <p className="tnum text-[11px] text-muted">+ {formatCurrency(serviceFeeFor(face))} fee</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line px-5 py-4">
        {bookable ? (
          <>
            <Link href={`/cart?event=${encodeURIComponent(event.slug)}`} className="block">
              <Button variant="primary" size="lg" fullWidth>
                Book Now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <p className="mt-2.5 text-center text-xs text-muted">
              Choose your tier on the next screen — you stay on TicketFlow Kenya throughout.
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <Image
                src="/mpesa-logo.svg"
                alt=""
                width={512}
                height={273}
                unoptimized
                className="h-4 w-auto"
                aria-hidden="true"
              />
              Pay securely by M-Pesa STK Push
            </p>
          </>
        ) : (
          <div className="space-y-3.5">
            <div className="rounded-btn border border-line bg-cream/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Not sold through TicketFlow Kenya
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {event.organizerName
                  ? `Tickets for this event are sold by ${event.organizerName} through its own authorised channel.`
                  : 'Tickets for this event are sold by the organizer through their own channels.'}{' '}
                TicketFlow does not take payment for this listing.
              </p>
            </div>

            {externalBooking && (
              <a
                href={event.bookingUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'lg', fullWidth: true })}
              >
                Open the official seller
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
