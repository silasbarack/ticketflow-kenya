import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { BG_COLOR_KEY } from '@/lib/appearance';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans' });

export const metadata: Metadata = {
  title: 'TicketFlow Kenya | Event Tickets, Sold Simply',
  description: 'Create events, sell tickets, accept M-Pesa payments, and manage check-ins — all in one platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
      <head>
        <Script
          id="apply-bg-color"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('${BG_COLOR_KEY}');if(c)document.documentElement.style.setProperty('--bg-color',c);}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans text-gray-900 antialiased">
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
