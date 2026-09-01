import Link from 'next/link';
import Image from 'next/image';
import { QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';

const EXPLORE_LINKS = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Become an Organizer', href: '/register' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Log In', href: '/login' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms and Conditions', href: '/legal/terms-and-conditions' },
  { label: 'Payment Policy', href: '/legal/payment-policy' },
];

const MORE_LEGAL_LINKS = [
  { label: 'Event Organizer Policy', href: '/legal/event-organizer-policy' },
  { label: 'Ticket Purchase Policy', href: '/legal/ticket-purchase-policy' },
  { label: 'Cookie Policy', href: '/legal/cookie-policy' },
];

const ASSURANCES = [
  { icon: Smartphone, text: 'M-Pesa STK Push' },
  { icon: QrCode, text: 'Signed QR tickets' },
  { icon: ShieldCheck, text: 'Verified organizers' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="eyebrow text-white/40">{title}</p>
      <nav className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="text-[14px] text-white/65 transition hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="ember-ground text-white/80">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/">
              <Logo theme="dark" className="h-9" />
            </Link>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/55">
              The all-in-one platform for event organizers to sell tickets, accept M-Pesa payments, and check in
              attendees with QR codes — built for Kenya.
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-[12px] text-white/50">
              {ASSURANCES.map((a) => (
                <li key={a.text} className="flex items-center gap-2">
                  <a.icon className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                  {a.text}
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title="Explore" links={EXPLORE_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="More Legal" links={MORE_LEGAL_LINKS} />
        </div>

        <div className="hairline mt-12" aria-hidden="true" />

        <div className="mt-7 flex flex-col items-center justify-between gap-4 text-[13px] text-white/45 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Payments powered by</span>
            <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
