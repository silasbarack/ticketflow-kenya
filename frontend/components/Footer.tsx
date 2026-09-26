'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import Logo from '@/components/Logo';

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.36 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'Facebook', icon: <Facebook size={16} />, bg: '#1877f2' },
  { label: 'Instagram', icon: <Instagram size={16} />, bg: 'linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)' },
  { label: 'X', icon: <XIcon />, bg: '#111' },
  { label: 'YouTube', icon: <Youtube size={16} />, bg: '#ff0000' },
  { label: 'LinkedIn', icon: <Linkedin size={16} />, bg: '#0a66c2' },
];

export default function Footer() {
  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    toast.success('Thanks! Newsletter sign-ups open soon — follow us for event drops.');
  }

  return (
    <footer className="tf-footer" id="contact">
      <div className="container-page">
        <div className="tf-footer-grid">
          <div className="tf-footer-brand">
            <Link href="/" aria-label="TicketFlow Kenya home"><Logo /></Link>
            <p>Good Events. Brighter People.</p>
          </div>

          <div className="tf-footer-col">
            <h3>Quick Links</h3>
            <Link href="/">Home</Link>
            <Link href="/events">Discover</Link>
            <Link href="/#categories">Categories</Link>
            <Link href="/#for-organizers">Organizers</Link>
            <Link href="/#about">About</Link>
          </div>

          <div className="tf-footer-col">
            <h3>Help</h3>
            <Link href="/legal/ticket-purchase-policy">Ticket Support</Link>
            <Link href="/legal/payment-policy">Refund &amp; Payments</Link>
            <Link href="/legal/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/legal/privacy-policy">Privacy Policy</Link>
            <Link href="/legal/cookie-policy">Cookie Policy</Link>
          </div>

          <div className="tf-footer-col">
            <h3>Connect With Us</h3>
            <div className="tf-socials">
              {SOCIALS.map((social) => (
                <a key={social.label} href="#contact" className="tf-social" style={{ background: social.bg }} aria-label={social.label}>
                  {social.icon}
                </a>
              ))}
            </div>
            <a className="tf-contact" href="mailto:support@ticketflow.co.ke"><Mail size={15} /> support@ticketflow.co.ke</a>
            <span className="tf-contact"><Phone size={15} /> Pay &amp; get help via M-Pesa</span>
            <span className="tf-contact"><MapPin size={15} /> Nairobi, Kenya</span>
          </div>

          <div className="tf-footer-col tf-newsletter">
            <h3>Join Our Newsletter</h3>
            <p>Get the latest events, offers and updates.</p>
            <form onSubmit={subscribe}>
              <input type="email" name="email" required placeholder="Your email address" aria-label="Your email address" />
              <button type="submit">Subscribe</button>
            </form>
            <div className="tf-mpesa">
              <span>Payments powered by</span>
              <Image src="/mpesa-logo.svg" alt="M-Pesa" width={78} height={40} unoptimized />
            </div>
          </div>
        </div>

        <div className="tf-footer-bottom">
          <span>© {new Date().getFullYear()} TicketFlow Kenya. All rights reserved.</span>
          <span className="tf-script">Events Make A <b>Brighter Kenya</b></span>
        </div>
      </div>
    </footer>
  );
}
