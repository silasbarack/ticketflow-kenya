import { Compass, QrCode, ScanLine, Smartphone } from 'lucide-react';
import Container from '@/components/ui/Container';

const STEPS = [
  {
    icon: Compass,
    title: 'Find your event',
    desc: 'Browse events across Kenya, then hit Book Now to open that event in your cart.',
  },
  {
    icon: Smartphone,
    title: 'Pick a tier & pay',
    desc: 'Choose Early Bird, Regular, Student, VIP or VVIP, confirm your number, and approve the M-Pesa prompt.',
  },
  {
    icon: QrCode,
    title: 'Get your QR ticket',
    desc: 'Every ticket is a unique signed QR code, issued to your account and inbox the moment payment clears.',
  },
  {
    icon: ScanLine,
    title: 'Scan at the gate',
    desc: 'Organizers verify entry in seconds — duplicate or fake tickets are rejected instantly.',
  },
];

export default function ProcessTimeline() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="eyebrow text-brand-700">How it works</p>
          <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em] text-navy-900 sm:text-[34px]">
            From discovery to gate entry
          </h2>
          <p className="mt-3 text-[15px] text-muted">
            Four steps, all of them on TicketFlow Kenya. Nothing hands you off to another site.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex flex-col rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-brand-50 text-brand-700">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="tnum text-3xl font-extrabold leading-none text-navy-900/[0.08]">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-navy-900">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.desc}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
