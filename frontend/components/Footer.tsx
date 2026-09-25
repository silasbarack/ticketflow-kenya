import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ShieldCheck, Smartphone, TicketCheck } from 'lucide-react';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';

const GROUPS = [
  {title: 'Discover', links: [['All events', '/events'], ['My tickets', '/dashboard/tickets'], ['My account', '/dashboard'], ['How it works', '/#how-it-works']]},
  {title: 'Organize', links: [['List your event', '/register'], ['Organizer dashboard', '/organizer/dashboard'], ['Organizer policy', '/legal/event-organizer-policy']]},
  {title: 'Support', links: [['Ticket purchase policy', '/legal/ticket-purchase-policy'], ['Payments & refunds', '/legal/payment-policy'], ['Terms & conditions', '/legal/terms-and-conditions'], ['Privacy policy', '/legal/privacy-policy']]},
];

export default function Footer() {
  return (
    <footer className="site-footer border-t border-line bg-navy-950 text-white">
      <Container className="py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_2fr] lg:gap-16">
          <div>
            <Link href="/" aria-label="TicketFlow Kenya home" className="inline-flex rounded-xl bg-white px-3 py-2">
              <Logo className="h-10" wordmarkClassName="text-base" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
              Discover memorable events across Kenya, book securely, and keep your QR tickets ready on your phone.
            </p>
            <Link href="/events" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15">
              Explore events <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-sm font-extrabold text-white">{group.title}</h2>
                <ul className="mt-4 space-y-1.5">
                  {group.links.map(([label, href]) => (
                    <li key={href}><Link href={href} className="inline-flex min-h-9 items-center text-sm text-white/60 transition hover:text-white">{label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4"><Smartphone className="h-5 w-5 text-brand-300" /><div><p className="text-sm font-bold">Mobile-first booking</p><p className="text-xs text-white/55">Fast on phones and desktop.</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4"><ShieldCheck className="h-5 w-5 text-brand-300" /><div><p className="text-sm font-bold">Secure checkout</p><p className="text-xs text-white/55">M-Pesa payment support.</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4"><TicketCheck className="h-5 w-5 text-brand-300" /><div><p className="text-sm font-bold">QR ticket entry</p><p className="text-xs text-white/55">Quick validation at the gate.</p></div></div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span>Book with</span>
            <span className="rounded-lg bg-white px-2 py-1"><Image src="/mpesa-logo.svg" alt="M-Pesa" width={512} height={273} unoptimized className="h-5 w-auto" /></span>
            <span className="border-l border-white/15 pl-3">Made for Kenya</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
