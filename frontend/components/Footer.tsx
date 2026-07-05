import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms and Conditions', href: '/legal/terms-and-conditions' },
  { label: 'Payment Policy', href: '/legal/payment-policy' },
  { label: 'Event Organizer Policy', href: '/legal/event-organizer-policy' },
  { label: 'Ticket Purchase Policy', href: '/legal/ticket-purchase-policy' },
  { label: 'Cookie Policy', href: '/legal/cookie-policy' },
];

const EXPLORE_LINKS = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Become an Organizer', href: '/register' },
  { label: 'Log in', href: '/login' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/">
              <Logo theme="dark" gradientId="tfk-logo-footer" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-400">
              The all-in-one platform for event organizers to sell tickets, accept M-Pesa
              payments, and check in attendees with QR codes — built for Kenya.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Explore</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              {EXPLORE_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-gray-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legal</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              {LEGAL_LINKS.slice(0, 3).map((link) => (
                <Link key={link.href} href={link.href} className="text-gray-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">More legal</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              {LEGAL_LINKS.slice(3).map((link) => (
                <Link key={link.href} href={link.href} className="text-gray-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-800 pt-6 text-sm text-gray-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <Image
              src="/mpesa-logo.svg"
              alt="M-PESA"
              width={512}
              height={273}
              unoptimized
              className="h-8 w-auto"
            />
          </div>
          <p>Built for event organizers and ticket buyers across Kenya.</p>
        </div>
      </div>
    </footer>
  );
}
