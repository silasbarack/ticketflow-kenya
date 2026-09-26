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
    <main className="min-h-[calc(100vh-var(--header-height))] bg-[#f7f8fa] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-[1080px] overflow-hidden rounded-[22px] border border-line bg-white shadow-card lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden min-h-[650px] overflow-hidden lg:block">
          <Image src="/hero-party.jpg" alt="" fill sizes="460px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5" />
          <div className="absolute inset-x-0 bottom-0 p-9 text-white">
            <div className="inline-flex rounded-xl bg-white p-2"><Logo className="h-20" /></div>
            <h2 className="mt-6 text-4xl font-black tracking-[-.04em]">{panelTitle}</h2>
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
          <Link href="/" className="mb-7 inline-flex w-fit rounded-xl bg-white lg:hidden"><Logo className="h-20" /></Link>
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-brand-600">TicketFlow Kenya</p>
          <h1 className="mt-2 text-[32px] font-black tracking-[-.04em] text-navy-900 sm:text-[38px]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
        </section>
      </div>
    </main>
  );
}
