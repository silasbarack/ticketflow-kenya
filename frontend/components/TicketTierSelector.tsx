'use client';

import { Minus, Plus } from 'lucide-react';
import { TicketType, TicketTypeCategory } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { SERVICE_FEE_PERCENT, serviceFeeFor } from '@/lib/fees';
import { TIER_BLURBS, TIER_TINT_COLORS, getTierStatus, sortTiers, tierLabel } from '@/lib/tiers';

const STATUS_COPY: Record<string, string> = {
  SOLD_OUT: 'Sold out',
  CLOSED: 'Sales closed',
  NOT_YET_ON_SALE: 'Not yet on sale',
};

export default function TicketTierSelector({
  ticketTypes,
  quantities,
  onChange,
}: {
  ticketTypes: TicketType[];
  quantities: Record<string, number>;
  onChange: (ticketTypeId: string, quantity: number) => void;
}) {
  if (ticketTypes.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line bg-cream/60 p-5 text-sm text-muted">
        No tickets have been released for this event yet — check back soon.
      </p>
    );
  }

  const tiers = sortTiers(ticketTypes);

  return (
    <div className="space-y-2.5">
      {tiers.map((tt) => {
        const status = getTierStatus(tt);
        const unavailable = status !== 'AVAILABLE';
        const available = Math.max(0, tt.quantity - tt.quantitySold);
        const qty = quantities[tt.id] || 0;
        const face = Number(tt.price);
        const tint = TIER_TINT_COLORS[tt.category as TicketTypeCategory] ?? 'bg-navy-900/5 text-navy-700 ring-navy-200';
        const blurb = tt.description || TIER_BLURBS[tt.category as TicketTypeCategory];

        return (
          <div
            key={tt.id}
            className={`rounded-card border p-4 transition-all duration-200 sm:p-5 ${
              qty > 0 ? 'border-brand-300 bg-brand-50/50 shadow-soft' : 'border-line bg-white'
            } ${unavailable ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span
                  className={`eyebrow inline-flex rounded-full px-2 py-1 ring-1 ring-inset ${tint}`}
                >
                  {tierLabel(tt.category)}
                </span>
                <p className="mt-2 font-display text-[15px] font-bold text-navy-900">{tt.name}</p>
                {blurb && <p className="mt-1 text-[13px] leading-relaxed text-muted">{blurb}</p>}
              </div>

              {/* Face value and the fee that rides on it, priced per ticket. */}
              <div className="shrink-0 text-right">
                <p className="tnum font-display text-lg font-bold text-navy-900">{formatCurrency(face)}</p>
                <p className="tnum text-[11px] text-muted">
                  + {formatCurrency(serviceFeeFor(face))} fee ({SERVICE_FEE_PERCENT}%)
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3.5">
              <span
                className={`text-xs font-semibold ${
                  unavailable || available <= 15 ? 'text-accent-700' : 'text-muted'
                }`}
              >
                {unavailable
                  ? status === 'NOT_YET_ON_SALE' && tt.salesStart
                    ? `On sale from ${formatDate(tt.salesStart)}`
                    : STATUS_COPY[status] ?? 'Unavailable'
                  : `${available} left`}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label={`Decrease quantity for ${tt.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-navy-700 transition hover:border-navy-300 disabled:opacity-30"
                  disabled={qty === 0}
                  onClick={() => onChange(tt.id, Math.max(0, qty - 1))}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="tnum w-6 text-center font-display text-base font-bold text-navy-900" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity for ${tt.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-navy-700 transition hover:border-navy-300 disabled:opacity-30"
                  disabled={unavailable || available <= qty}
                  onClick={() => onChange(tt.id, qty + 1)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
