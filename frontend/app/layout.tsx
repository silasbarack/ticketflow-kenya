import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { BG_COLOR_KEY, BLACK } from '@/lib/appearance';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans' });

export const metadata: Metadata = {
  title: {
    default: 'TicketFlow Kenya | Discover Events & Book with M-Pesa',
    template: '%s | TicketFlow Kenya',
  },
  description: 'Discover events across Kenya, book securely with M-Pesa, and access signed QR tickets from your phone.',
  openGraph: {
    title: 'TicketFlow Kenya',
    description: 'Discover events across Kenya and book securely with M-Pesa.',
    type: 'website',
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TicketFlow Kenya',
    description: 'Discover events across Kenya and book securely with M-Pesa.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning>
      <head>
        <Script
          id="apply-bg-color"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('${BG_COLOR_KEY}');if(c){document.documentElement.style.setProperty('--bg-color',c);document.documentElement.dataset.theme=c.toLowerCase()==='${BLACK}'?'dark':'light';}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans text-navy-900 antialiased">
        <Providers>
          <Navbar />
          {children}
          <Footer />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
