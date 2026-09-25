import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Youtube } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="ref-footer" id="contact">
      <div className="container-page">
        <div className="ref-footer-grid">
          <div className="ref-footer-brand">
            <Link href="/" aria-label="TicketFlow Kenya home"><Logo className="h-16" /></Link>
            <p>Good events. Brighter people.</p>
            <small>Discover and manage memorable experiences across Kenya.</small>
          </div>

          <div className="ref-footer-col">
            <h3>Quick Links</h3>
            <Link href="/">Home</Link>
            <Link href="/events">Discover</Link>
            <Link href="/#categories">Categories</Link>
            <Link href="/register">Organizers</Link>
            <Link href="/#about">About</Link>
          </div>

          <div className="ref-footer-col">
            <h3>Help</h3>
            <Link href="/legal/ticket-purchase-policy">Ticket Support</Link>
            <Link href="/legal/payment-policy">Payment Policy</Link>
            <Link href="/legal/terms-and-conditions">Terms & Conditions</Link>
            <Link href="/legal/privacy-policy">Privacy Policy</Link>
          </div>

          <div className="ref-footer-col ref-footer-contact">
            <h3>Connect With Us</h3>
            <div className="ref-socials">
              <a href="#" aria-label="Facebook"><Facebook /></a>
              <a href="#" aria-label="Instagram"><Instagram /></a>
              <a href="#" aria-label="YouTube"><Youtube /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin /></a>
            </div>
            <span><Mail /> support@ticketflow.co.ke</span>
            <span><MapPin /> Nairobi, Kenya</span>
            <span><Phone /> TicketFlow customer support</span>
          </div>

          <div className="ref-footer-col ref-newsletter">
            <h3>Join Our Newsletter</h3>
            <p>Get the latest events and platform updates.</p>
            <form action="/events">
              <input type="email" name="email" placeholder="Your email address" aria-label="Your email address" />
              <button type="submit" aria-label="Subscribe"><Send /></button>
            </form>
            <div className="ref-mpesa-foot"><span>Payments supported with</span><Image src="/mpesa-logo.svg" alt="M-Pesa" width={96} height={48} unoptimized /></div>
          </div>
        </div>

        <div className="ref-footer-bottom">
          <span>© {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</span>
          <span>Events make a brighter Kenya.</span>
        </div>
      </div>
    </footer>
  );
}
