import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Logo from '@/components/Logo';

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
  return (
    <main className="relative min-h-[calc(100vh-var(--header-height))] overflow-hidden bg-[#f7f8fb] px-4 py-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/15 blur-3xl animate-ember-drift" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 h-[24rem] w-[24rem] rounded-full bg-brand-500/10 blur-3xl animate-ember-drift" />
      <div className="tf-rise relative mx-auto grid max-w-[1080px] overflow-hidden rounded-[24px] border border-line bg-white shadow-elevated lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden min-h-[650px] overflow-hidden lg:block">
          <Image src="/hero-party.jpg" alt="" fill sizes="460px" className="object-cover animate-[tf-kenburns_18s_ease-in-out_infinite_alternate]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-brand-700/30" />
          <div className="tf-script absolute right-8 top-8 rotate-[-6deg] text-right text-3xl !text-white">Good Events<br /><b>Brighter People</b></div>
          <div className="absolute inset-x-0 bottom-0 p-9 text-white">
            <Logo theme="dark" className="h-12" />
            <h2 className="mt-6 text-4xl font-extrabold tracking-[-.03em]">{panelTitle}</h2>
            <ul className="mt-6 space-y-3">
              {panelPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-6 text-white/85">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600"><Check className="h-3.5 w-3.5" /></span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex min-h-[570px] flex-col justify-center px-5 py-8 sm:px-10 lg:px-14">
          <Link href="/" className="mb-7 inline-flex w-fit lg:hidden" aria-label="TicketFlow Kenya home"><Logo className="h-11" /></Link>
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-brand-600">TicketFlow Kenya</p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-.03em] text-navy-900 sm:text-[36px]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
        </section>
      </div>
    </main>
  );
}
