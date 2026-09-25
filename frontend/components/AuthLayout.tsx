import { ReactNode } from 'react';
import Image from 'next/image';
import { Check, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ title, subtitle, panelTitle, panelPoints, footer, children }: {
  title: string; subtitle: string; panelTitle: string; panelPoints: string[]; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-var(--header-height))] bg-cream px-4 py-6 sm:py-10 lg:py-14">
      <div className="mx-auto grid max-w-[1080px] overflow-hidden rounded-panel border border-line bg-white shadow-card lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden min-h-[640px] flex-col justify-end overflow-hidden bg-ink-900 p-10 text-white lg:flex">
          <Image src="/hero-party.jpg" alt="" fill sizes="520px" className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" aria-hidden="true" />
          <div className="relative max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-200">TicketFlow Kenya</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em]">{panelTitle}</h2>
            <ul className="mt-7 space-y-4">
              {panelPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-white/85">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10"><Check className="h-3.5 w-3.5 text-brand-200" aria-hidden="true" /></span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-[30px] font-black tracking-[-0.035em] text-navy-900 sm:text-[34px]">{title}</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-7 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Secure access to your TicketFlow account</p>
        </section>
      </div>
    </main>
  );
}
