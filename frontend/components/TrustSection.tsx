import { CreditCard, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import Container from '@/components/ui/Container';

export default function TrustSection({ eventsTotal, citiesCount }: { eventsTotal?: number; citiesCount?: number }) {
  const stats = [
    { icon: Sparkles, value: eventsTotal ? `${eventsTotal}+` : 'Growing', label: 'Events listed' },
    { icon: MapPinned, value: citiesCount ? `${citiesCount}` : 'Multiple', label: 'Cities across Kenya' },
    { icon: CreditCard, value: 'M-Pesa', label: 'Secure checkout' },
    { icon: ShieldCheck, value: 'Verified', label: 'Event organizers' },
  ];

  return (
    <section className="border-b border-line bg-white py-10 sm:py-12">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-center gap-3.5 ${i > 0 ? 'lg:border-l lg:border-line lg:pl-7' : ''}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="tnum font-display text-xl font-extrabold tracking-[-0.02em] text-navy-900">{s.value}</p>
                <p className="text-[13px] text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
