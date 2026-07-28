'use client';

import { Minus, Plus } from 'lucide-react';
import { TicketType } from '@/types';
import { formatCurrency, formatTicketCategory } from '@/lib/format';
import { totalWithServiceFee } from '@/lib/fees';

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
    return <p className="text-sm text-muted">No tickets available yet — check back soon.</p>;
  }

  return (
    <div className="space-y-3">
      {ticketTypes.map((tt) => {
        const available = tt.quantity - tt.quantitySold;
        const soldOut = available <= 0;
        const qty = quantities[tt.id] || 0;

        return (
          <div
            key={tt.id}
            className={`rounded-2xl border p-4 transition ${qty > 0 ? 'border-brand-300 bg-brand-50/40' : 'border-line'} ${soldOut ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900">{tt.name}</p>
                <p className="text-xs text-muted">{formatTicketCategory(tt.category)}</p>
                {tt.description && <p className="mt-1 text-xs text-muted">{tt.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-navy-900">{formatCurrency(totalWithServiceFee(Number(tt.price)))}</p>
                <p className="text-[11px] text-muted">incl. service fee</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs font-medium ${soldOut ? 'text-accent-600' : available <= 15 ? 'text-accent-600' : 'text-muted'}`}>
                {soldOut ? 'Sold out' : `${available} left`}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Decrease quantity for ${tt.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-navy-600 transition hover:border-navy-300 disabled:opacity-30"
                  disabled={qty === 0}
                  onClick={() => onChange(tt.id, Math.max(0, qty - 1))}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-5 text-center text-sm font-semibold text-navy-900" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity for ${tt.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-navy-600 transition hover:border-navy-300 disabled:opacity-30"
                  disabled={soldOut || available <= qty}
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
