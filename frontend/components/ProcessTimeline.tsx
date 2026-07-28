import { Compass, QrCode, ScanLine, Smartphone } from 'lucide-react';
import Container from '@/components/ui/Container';

const STEPS = [
  {
    icon: Compass,
    title: 'Discover or publish',
    desc: 'Browse events across Kenya, or set up your own in minutes with tiered ticket types.',
  },
  {
    icon: Smartphone,
    title: 'Pay with M-Pesa',
    desc: 'Check out securely with an M-Pesa STK Push — no cash, no manual reconciliation.',
  },
  {
    icon: QrCode,
    title: 'Get your QR ticket',
    desc: 'Every ticket is a unique, signed QR code delivered instantly to your account and inbox.',
  },
  {
    icon: ScanLine,
    title: 'Scan at the gate',
    desc: 'Organizers verify entry in seconds — duplicate or fake tickets are rejected instantly.',
  },
];

export default function ProcessTimeline() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-14 sm:py-20">
      <Container>
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">How it works</p>
          <h2 className="mt-1.5 text-[28px] font-bold text-navy-900 sm:text-3xl">From discovery to gate entry</h2>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="relative mt-14 hidden gap-6 sm:grid sm:grid-cols-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-line sm:block" aria-hidden="true" />
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white text-brand-700 shadow-soft">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-bold text-muted">STEP {i + 1}</p>
              <h3 className="mt-1 font-semibold text-navy-900">{step.title}</h3>
              <p className="mt-2 max-w-[220px] text-sm text-muted">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="relative mt-10 space-y-8 sm:hidden">
          <div className="absolute bottom-2 left-7 top-2 w-px bg-line" aria-hidden="true" />
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative flex gap-4">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-white text-brand-700 shadow-soft">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="pt-2">
                <p className="text-xs font-bold text-muted">STEP {i + 1}</p>
                <h3 className="mt-0.5 font-semibold text-navy-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
