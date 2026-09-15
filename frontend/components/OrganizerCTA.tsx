import Link from 'next/link';
import { BarChart3, Check, QrCode, Smartphone, TicketPlus } from 'lucide-react';
import Container from '@/components/ui/Container';
import { SERVICE_FEE_PERCENT } from '@/lib/fees';
import Button from '@/components/ui/Button';

const BENEFITS = [
  'Create Regular, VIP, VVIP, Student and Early Bird ticket tiers',
  'Track sales and revenue from live platform data',
  'Accept M-Pesa payments with settlement tracking',
  'Scan and validate QR tickets at the gate in real time',
  'Export attendee reports as CSV',
];

const WORKFLOW = [
  { icon: TicketPlus, label: 'Publish', text: 'Create the event and define each ticket tier.' },
  { icon: Smartphone, label: 'Sell', text: 'Customers pay by M-Pesa and receive QR tickets.' },
  { icon: BarChart3, label: 'Track', text: 'Follow actual orders, revenue and attendance.' },
  { icon: QrCode, label: 'Check in', text: 'Validate each ticket once at the entrance.' },
];

export default function OrganizerCTA() {
  return (
    <section id="for-organizers" className="ember-ground scroll-mt-20 py-16 text-white sm:py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="panel-glass p-5 shadow-elevated sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/70">One connected event workflow</p>
                <span className="flex items-center gap-1 rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300">
                  <TicketPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Organizer tools
                </span>
              </div>

              <ol className="mt-6 space-y-3">
                {WORKFLOW.map((step, index) => (
                  <li key={step.label} className="flex items-center gap-3 rounded-btn border border-white/10 bg-white/[0.05] p-3.5">
                    <span className="tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-brand-500/20 text-xs font-extrabold text-brand-200">
                      {index + 1}
                    </span>
                    <step.icon className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-white">{step.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/52">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="eyebrow flex items-center gap-2 text-brand-400">
              <TicketPlus className="h-4 w-4" aria-hidden="true" />
              For Organizers
            </p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[40px]">
              One workspace from first sale to <span className="ember-text">final scan.</span>
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Publish your event, sell every ticket tier and manage the door from a dashboard built for Kenyan organizers.
            </p>

            <ul className="mt-7 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register"><Button variant="primary" size="lg">Start selling tickets</Button></Link>
              <p className="max-w-sm text-sm leading-relaxed text-white/60">
                Organizers receive the ticket subtotal; buyers see the transparent {SERVICE_FEE_PERCENT}% service fee before payment.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
