import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';

const GROUPS = [
  {title: 'Discover', links: [['All events', '/events'], ['My tickets', '/dashboard/tickets'], ['My account', '/dashboard'], ['How it works', '/#how-it-works']]},
  {title: 'Organize', links: [['List your event', '/register'], ['Organizer dashboard', '/organizer/dashboard'], ['Organizer policy', '/legal/event-organizer-policy']]},
  {title: 'Help & information', links: [['Ticket purchase policy', '/legal/ticket-purchase-policy'], ['Payments & refunds', '/legal/payment-policy'], ['Terms & conditions', '/legal/terms-and-conditions'], ['Privacy policy', '/legal/privacy-policy'], ['Cookie policy', '/legal/cookie-policy']]},
];
export default function Footer() {
  return (
    <footer className="site-footer border-t border-line bg-white text-navy-900">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div><Link href="/" aria-label="TicketFlow Kenya home"><Logo className="h-12" wordmarkClassName="text-lg" /></Link><p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">Good experiences bring people together. Find yours with TicketFlow Kenya.</p><Link href="/events" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-700">See what&apos;s happening <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
          {GROUPS.map((group) => <nav key={group.title} aria-label={group.title}><h2 className="text-sm font-bold">{group.title}</h2><ul className="mt-3 space-y-1">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-brand-700">{label}</Link></li>)}</ul></nav>)}
        </div>
        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p><div className="flex items-center gap-3"><span>Book with</span><Image src="/mpesa-logo.svg" alt="M-Pesa" width={512} height={273} unoptimized className="h-6 w-auto" /><span className="border-l border-line pl-3">Made for Kenya</span></div></div>
      </Container>
    </footer>
  );
}
