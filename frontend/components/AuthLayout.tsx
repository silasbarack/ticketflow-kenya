import { ReactNode } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Logo from '@/components/Logo';

/**
 * Split-screen shell for every account screen: the brand panel carries the
 * ember ground and the reasons to sign in, the right column carries the form.
 * On phones the panel collapses to a short banner so the form stays first.
 */
export default function AuthLayout({
  title,
  subtitle,
  panelTitle,
  panelPoints,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  panelTitle: string;
  panelPoints: string[];
  footer?: ReactNode;
  children: ReactNode;
}) {
  // Header is 70px on its own, 106px once the value strip appears at lg.
  return (
    <main className="grid min-h-[calc(100vh-70px)] lg:min-h-[calc(100vh-106px)] lg:grid-cols-2">
      {/* Brand panel */}
      <section className="ember-ground relative flex flex-col justify-center overflow-hidden px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-16">
        <div className="relative mx-auto w-full max-w-md">
          <Link href="/" aria-label="TicketFlow Kenya home" className="inline-flex">
            <Logo theme="dark" className="h-9" />
          </Link>

          <h2 className="mt-8 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[34px]">
            {panelTitle}
          </h2>

          <ul className="mt-7 space-y-3.5">
            {panelPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[14px] leading-relaxed text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="hairline mt-9" aria-hidden="true" />
          <p className="mt-5 text-[12px] text-white/40">
            Payments are processed by Safaricom M-Pesa. TicketFlow never sees your PIN.
          </p>
        </div>
      </section>

      {/* Form column */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:px-14">
        <div className="w-full max-w-md">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-navy-900 sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
