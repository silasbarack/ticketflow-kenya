import Image from 'next/image';
import { CalendarDays, CheckCircle2, MapPin, Music2, Search, ShieldCheck, Smartphone, Sparkles, Zap } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteQrCode from '@/components/SiteQrCode';

const MARQUEE = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Diani', 'Naivasha', 'Thika', 'Nanyuki', 'Malindi'];

export type HeroSearchDefaults = { q?: string; category?: string; city?: string; date?: string };

function HeroSwoosh() {
  return (
    <svg className="tf-hero-swoosh" viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tf-swoosh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2a52" />
          <stop offset="1" stopColor="#b00022" />
        </linearGradient>
      </defs>
      <path d="M120 40h230a24 24 0 0 1 24 24v70a30 30 0 0 0 0 60v150a24 24 0 0 1-24 24H150C90 368 30 300 60 200 80 130 70 70 120 40Z" fill="url(#tf-swoosh)" />
      <path d="M300 50v320" stroke="#fff" strokeOpacity=".55" strokeWidth="5" strokeDasharray="12 14" strokeLinecap="round" />
      <path d="M0 330C90 330 150 300 210 230" stroke="#e6002d" strokeWidth="10" strokeLinecap="round" opacity=".35" />
      <path d="M10 370C120 372 200 330 250 270" stroke="#e6002d" strokeWidth="6" strokeLinecap="round" opacity=".25" />
    </svg>
  );
}

/**
 * The main TicketFlow hero (headline, search, and the phone showing a real QR
 * ticket) plus the city marquee. Shared by the home page and /events so both
 * open on the same screen; /events passes its current filters as `defaults`
 * so the search form reflects them.
 */
export default function HomeHero({ defaults = {} }: { defaults?: HeroSearchDefaults }) {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="tf-hero">
        <div className="container-page tf-hero-grid">
          <div>
            <span className="tf-kicker tf-rise"><span className="tf-live-dot" /> Events bring us together</span>
            <h1 className="tf-rise" style={{ '--d': '80ms' } as React.CSSProperties}>
              Discover Kenya&apos;s<br />
              <span className="red">Best Events</span>
            </h1>
            <p className="tf-hero-lead tf-rise" style={{ '--d': '160ms' } as React.CSSProperties}>
              Book concerts, festivals, theatre, sports,
              conferences and amazing experiences across Kenya. Your next great moment is just a ticket away.
            </p>

            <form action="/events" className="tf-search tf-rise" style={{ '--d': '240ms' } as React.CSSProperties} aria-label="Search events">
              <label>
                <Music2 size={20} />
                <span><small>Event Type</small>
                  <select name="category" defaultValue={defaults.category || ''} aria-label="Event type">
                    <option value="">All Events</option>
                    <option value="music">Concerts</option>
                    <option value="festival">Festivals</option>
                    <option value="culture">Theatre &amp; Culture</option>
                    <option value="sports">Sports</option>
                    <option value="technology">Conferences</option>
                    <option value="nightlife">Nightlife</option>
                  </select>
                </span>
              </label>
              <label>
                <MapPin size={20} />
                <span><small>City</small>
                  <select name="city" defaultValue={defaults.city || ''} aria-label="City">
                    <option value="">Select City</option>
                    <option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option><option>Eldoret</option>
                  </select>
                </span>
              </label>
              <label>
                <CalendarDays size={20} />
                <span><small>Date</small>
                  <select name="date" defaultValue={defaults.date || ''} aria-label="Date">
                    <option value="">Any Date</option>
                    <option value="today">Today</option>
                    <option value="weekend">This Weekend</option>
                    <option value="month">Next 30 Days</option>
                  </select>
                </span>
              </label>
              {defaults.q && <input type="hidden" name="q" value={defaults.q} />}
              <button type="submit" className="tf-shine"><Search size={17} /> Search Events</button>
            </form>

            <div className="tf-benefits tf-rise" style={{ '--d': '320ms' } as React.CSSProperties}>
              <div><ShieldCheck size={26} /><span><b>Secure Payments</b><small>Your data is safe with us</small></span></div>
              <div><Zap size={26} /><span><b>Instant E-Tickets</b><small>Get your tickets instantly</small></span></div>
              <div><Smartphone size={26} /><span><b>M-Pesa Support</b><small>Pay easily with M-Pesa</small></span></div>
            </div>
          </div>

          <div className="tf-hero-visual tf-rise" style={{ '--d': '200ms' } as React.CSSProperties}>
            <HeroSwoosh />
            <div className="tf-hero-photo">
              <Image src="/hero-party.jpg" alt="Crowd celebrating at a live concert in Kenya" fill priority sizes="(max-width: 1080px) 80vw, 40vw" />
            </div>
            <div className="tf-script tf-hero-script-a">Good Events<br /><b>Brighter People</b></div>
            <div className="tf-phone" aria-hidden="true">
              <div className="tf-phone-screen">
                <span className="tf-phone-notch" />
                <Logo variant="stacked" theme="light" />
                <div className="tf-phone-qr"><SiteQrCode /></div>
                <span className="tf-script">Good Events<br /><b>Brighter People</b></span>
                <span className="tf-phone-chip">ADMIT ONE · VIP</span>
              </div>
            </div>
            <div className="tf-hero-toast" aria-hidden="true">
              <span><CheckCircle2 size={20} /></span>
              <span><b>Payment confirmed</b><small>Your QR ticket is ready 🎉</small></span>
            </div>
            <div className="tf-script tf-hero-script-b">Events Make A<br /><b>Brighter Kenya</b></div>
          </div>
        </div>
      </section>

      <div className="tf-marquee" aria-hidden="true">
        <div className="tf-marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {MARQUEE.map((city) => <span key={city + copy}><Sparkles size={14} /> {city}</span>)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
