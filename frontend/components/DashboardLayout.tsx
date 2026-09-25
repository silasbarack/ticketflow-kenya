'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { ArrowLeft, LogOut, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function DashboardLayout({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const workspaceLabel = user?.role === 'ADMIN' ? 'Platform administration' : 'Organizer workspace';

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-cream">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[260px] shrink-0 flex-col border-r border-line bg-white px-4 py-6 text-navy-900 lg:flex">
          <div className="border-b border-line px-2 pb-5">
            <div className="flex items-center justify-between gap-3">
              <Logo variant="icon" className="h-9" />
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-700">
                {user?.role === 'ADMIN' ? 'Admin' : 'Organizer'}
              </span>
            </div>
            <p className="mt-4 text-sm font-bold text-navy-900">{user?.firstName} {user?.lastName}</p>
            <p className="mt-0.5 text-xs text-muted">{workspaceLabel}</p>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1.5" aria-label={`${workspaceLabel} navigation`}>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition',
                    active ? 'bg-brand-50 text-brand-700 shadow-soft' : 'text-navy-600 hover:bg-surface hover:text-navy-900',
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-line pt-4">
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-btn px-3.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-navy-900">
              <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
              Back to TicketFlow
            </Link>
            <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-btn px-3.5 text-left text-sm font-medium text-muted transition hover:bg-surface hover:text-navy-900">
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Log out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-[var(--header-height)] z-20 border-b border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur lg:hidden">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              {workspaceLabel}
            </div>
            <nav className="snap-row gap-2" aria-label={`${workspaceLabel} navigation`}>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx('flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-navy-700')}
                  >
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
