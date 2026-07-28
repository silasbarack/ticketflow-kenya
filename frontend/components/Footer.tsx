import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';

const EXPLORE_LINKS = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Become an Organizer', href: '/register' },
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
    <footer className="bg-black text-white/80">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/">
              <Logo theme="dark" className="h-9" />
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/60">
              The all-in-one platform for event organizers to sell tickets, accept M-Pesa
              payments, and check in attendees with QR codes — built for Kenya.
            </p>
          </div>

          <FooterColumn title="Explore" links={EXPLORE_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="More Legal" links={MORE_LEGAL_LINKS} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 text-sm text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <Image src="/mpesa-logo.svg" alt="M-PESA" width={512} height={273} unoptimized className="h-6 w-auto" />
          </div>
          <p>Built for event organizers and ticket buyers across Kenya.</p>
        </div>
      </Container>
    </footer>
  );
}
