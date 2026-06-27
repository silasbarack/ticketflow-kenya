'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import clsx from 'clsx';

const POLICIES = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms and Conditions', href: '/legal/terms-and-conditions' },
  { label: 'Payment Policy', href: '/legal/payment-policy' },
  { label: 'Event Organizer Policy', href: '/legal/event-organizer-policy' },
  { label: 'Ticket Purchase Policy', href: '/legal/ticket-purchase-policy' },
  { label: 'Cookie Policy', href: '/legal/cookie-policy' },
];

export default function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Legal</p>
          <nav className="mt-3 flex flex-col gap-1">
            {POLICIES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  pathname === p.href ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-400">Effective date: {effectiveDate}</p>
          <div className="prose-legal mt-8 space-y-6 text-sm leading-6 text-gray-700 sm:text-base">{children}</div>
        </article>
      </div>
    </main>
  );
}
