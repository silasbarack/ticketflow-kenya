import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Mail, MapPin, ShieldCheck } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="fresh-footer">
      <div className="container-page">
        <div className="fresh-footer-main">
          <div className="fresh-footer-brand">
            <Link href="/" className="fresh-footer-logo"><Logo theme="dark" className="h-10" wordmarkClassName="text-[17px]" /></Link>
            <p>Discover what is happening across Kenya, book supported events securely, and keep your ticket on your phone.</p>
            <div className="fresh-footer-contact">
              <span><MapPin size={15} /> Kenya</span>
              <span><Mail size={15} /> Support through TicketFlow</span>
            </div>
          </div>

          <div className="fresh-footer-links">
            <div><h3>Discover</h3><Link href="/events">All events</Link><Link href="/events?city=Nairobi">Nairobi events</Link><Link href="/dashboard/tickets">My tickets</Link></div>
            <div><h3>Organizers</h3><Link href="/register">List an event</Link><Link href="/organizer/dashboard">Dashboard</Link><Link href="/legal/event-organizer-policy">Organizer policy</Link></div>
            <div><h3>Help & legal</h3><Link href="/legal/ticket-purchase-policy">Ticket policy</Link><Link href="/legal/payment-policy">Payments</Link><Link href="/legal/privacy-policy">Privacy</Link></div>
          </div>
        </div>

        <div className="fresh-payment-strip">
          <div><ShieldCheck size={18} /><span><b>Secure event checkout</b><small>TicketFlow-hosted events support mobile-first booking and M-Pesa workflows.</small></span></div>
          <span className="fresh-mpesa"><Image src="/mpesa-logo.svg" alt="M-Pesa" width={128} height={68} unoptimized /></span>
          <Link href="/events">Browse events <ArrowUpRight size={16} /></Link>
        </div>

        <div className="fresh-footer-bottom">
          <span>© {new Date().getFullYear()} TicketFlow Kenya.</span>
          <span>Built for mobile and desktop.</span>
        </div>
      </div>
    </footer>
  );
}
