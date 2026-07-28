import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';

const DISCOVER_LINKS = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Categories', href: '/events' },
  { label: 'How It Works', href: '/#how-it-works' },
];

const ORGANIZER_LINKS = [
  { label: 'Create an Event', href: '/register' },
  { label: 'Organizer Dashboard', href: '/organizer/dashboard' },
  { label: 'Scan Tickets', href: '/organizer/scan' },
];

const SUPPORT_LINKS = [
  { label: 'Help Centre', href: 'mailto:support@ticketflow.co.ke' },
  { label: 'Contact Us', href: 'mailto:support@ticketflow.co.ke' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms and Conditions', href: '/legal/terms-and-conditions' },
  { label: 'Payment Policy', href: '/legal/payment-policy' },
  { label: 'Ticket Purchase Policy', href: '/legal/ticket-purchase-policy' },
  { label: 'Event Organizer Policy', href: '/legal/event-organizer-policy' },
  { label: 'Cookie Policy', href: '/legal/cookie-policy' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{title}</p>
      <nav className="mt-3.5 flex flex-col gap-2.5">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="text-[15px] text-white/70 transition hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white/80">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/">
              <Logo theme="dark" className="h-9" />
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/60">
              Kenya&apos;s modern marketplace for concerts, festivals, theatre, sports and business
              events — with instant M-Pesa checkout and QR ticketing.
            </p>
          </div>

          <FooterColumn title="Discover" links={DISCOVER_LINKS} />
          <FooterColumn title="Organizers" links={ORGANIZER_LINKS} />
          <FooterColumn title="Support" links={SUPPORT_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 text-sm text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Secure payments via</span>
            <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
