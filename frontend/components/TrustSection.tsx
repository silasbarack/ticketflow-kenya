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
    <section className="border-y border-line bg-white py-12 sm:py-14">
      <Container>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-bold text-navy-900 sm:text-xl">{s.value}</p>
                <p className="text-xs font-medium text-muted sm:text-sm">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
