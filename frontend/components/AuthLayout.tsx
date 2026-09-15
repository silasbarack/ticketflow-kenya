import { ReactNode } from 'react';
import Image from 'next/image';
import { Check, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ title, subtitle, panelTitle, panelPoints, footer, children }: {
  title: string; subtitle: string; panelTitle: string; panelPoints: string[]; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="bg-cream px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 overflow-hidden rounded-panel border border-line bg-white lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-end overflow-hidden bg-ink-900 p-9 text-white lg:flex">
          <Image src="/hero-party.jpg" alt="" fill sizes="450px" className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" aria-hidden="true" />
          <div className="relative"><p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">Be part of the experience</p><h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight">{panelTitle}</h2><ul className="mt-6 space-y-3">{panelPoints.map((point) => <li key={point} className="flex gap-3 text-sm leading-relaxed text-white/85"><Check className="mt-1 h-4 w-4 shrink-0 text-white" aria-hidden="true" />{point}</li>)}</ul></div>
        </aside>
        <section className="px-5 py-8 sm:px-10 sm:py-10">
          <div className="mb-6 h-1 w-10 rounded-full bg-brand-600" aria-hidden="true" />
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy-900">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-7 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Your account. Your experiences.</p>
        </section>
      </div>
    </main>
  );
}
