import { TicketType, TicketTypeCategory } from '@/types';
import { formatCurrency } from '@/lib/format';

const TIER_ORDER: TicketTypeCategory[] = ['EARLY_BIRD', 'REGULAR', 'STUDENT', 'VIP', 'VVIP'];

const TIER_STYLES: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'bg-emerald-500',
  REGULAR: 'bg-sky-500',
  STUDENT: 'bg-amber-500',
  VIP: 'bg-violet-500',
  VVIP: 'bg-brand-600',
};

const TIER_LABELS: Record<TicketTypeCategory, string> = {
  EARLY_BIRD: 'Early Bird',
  REGULAR: 'Regular',
  STUDENT: 'Student',
  VIP: 'VIP',
  VVIP: 'VVIP',
};

export default function TicketPriceStrip({ ticketTypes }: { ticketTypes: TicketType[] }) {
  const tiers = TIER_ORDER.map((category) => ticketTypes.find((tt) => tt.category === category)).filter(
    (tt): tt is NonNullable<typeof tt> => Boolean(tt),
  );

  if (tiers.length === 0) return null;

  return (
    <div className="grid grid-cols-5" aria-label="Ticket prices">
      {tiers.map((tt) => (
        <div key={tt.id} className={`px-1 py-2 text-center leading-tight text-white ${TIER_STYLES[tt.category]}`}>
          <div className="text-[9px] font-bold uppercase tracking-tight">{TIER_LABELS[tt.category]}</div>
          <div className="text-[10px] font-extrabold">{formatCurrency(tt.price)}</div>
        </div>
      ))}
    </div>
  );
}
