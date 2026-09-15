'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CONSENT_KEY = 'tfk_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  function choose(value: 'all' | 'necessary') {
    window.localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 p-3 shadow-elevated backdrop-blur sm:p-4">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-4xl text-[13px] leading-relaxed text-muted">
          We use strictly necessary cookies to keep you logged in and process payments, plus
          optional functional and analytics cookies to improve TicketFlow Kenya. Read our{' '}
          <Link href="/legal/cookie-policy" className="font-semibold text-brand-600 hover:text-brand-700">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            onClick={() => choose('necessary')}
            className="min-h-11 flex-1 rounded-btn border border-line px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream sm:flex-none"
          >
            Necessary only
          </button>
          <button
            onClick={() => choose('all')}
            className="min-h-11 flex-1 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:flex-none"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
