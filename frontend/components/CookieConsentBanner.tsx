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
    <div className="fixed bottom-0 left-0 z-50 w-[100vw] max-w-full border-t border-line bg-white/95 p-3 shadow-elevated backdrop-blur sm:p-4">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-4xl text-[13px] leading-relaxed text-muted">
          We use essential cookies for bookings, and optional cookies to improve your experience.{' '}
          <Link href="/legal/cookie-policy" className="font-semibold text-brand-600 hover:text-brand-700">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
          <button
            onClick={() => choose('necessary')}
            className="min-h-11 min-w-0 rounded-btn border border-line px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream sm:px-4 sm:text-sm"
          >
            Necessary only
          </button>
          <button
            onClick={() => choose('all')}
            className="min-h-11 min-w-0 rounded-btn bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 sm:px-4 sm:text-sm"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
