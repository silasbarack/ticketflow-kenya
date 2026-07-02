import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans' });

export const metadata: Metadata = {
  title: 'TicketFlow Kenya | Event Tickets, Sold Simply',
  description: 'Create events, sell tickets, accept M-Pesa payments, and manage check-ins — all in one platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
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
