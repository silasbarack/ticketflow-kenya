'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { ArrowLeft, LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import clsx from 'clsx';

interface NavItem { label: string; href: string; icon: LucideIcon; }

export default function DashboardLayout({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'TF';

  return (
    <div className="tf-dash min-h-[calc(100vh-var(--header-height))]">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[272px] shrink-0 flex-col border-r border-line bg-gradient-to-b from-white to-[#fafafc] px-4 py-5 lg:flex">
          <div className="px-2 pb-5">
            <Link href="/" aria-label="TicketFlow Kenya home"><Logo className="h-10" /></Link>
          </div>

          <div className="mx-1 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-soft">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[13px] font-extrabold tracking-wide text-white ring-2 ring-brand-600/25">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-navy-900">{user?.firstName} {user?.lastName}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                {isAdmin ? 'Platform administrator' : 'Organizer workspace'}
              </p>
            </div>
          </div>

          <p className="mt-7 px-3.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-navy-400">Workspace</p>
          <nav className="mt-2 flex flex-1 flex-col gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={clsx(
                  'group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[13.5px] font-bold transition duration-200',
                  active ? 'bg-ink-900 text-white shadow-card' : 'text-navy-600 hover:bg-navy-900/[0.045] hover:text-navy-900',
                )}>
                  {active && <span className="absolute -left-4 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-brand-600" aria-hidden="true" />}
                  <item.icon className={clsx('h-[18px] w-[18px] transition', active ? 'text-brand-400' : 'text-navy-400 group-hover:text-brand-600')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-line pt-4">
            <Link href="/" className="flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-[13px] font-semibold text-muted transition hover:bg-navy-900/[0.045] hover:text-navy-900"><ArrowLeft size={17}/> Back to TicketFlow</Link>
            <button type="button" onClick={logout} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[13px] font-semibold text-muted transition hover:bg-brand-50 hover:text-brand-700"><LogOut size={17}/> Log out</button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-[var(--header-height)] z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <nav className="snap-row gap-2">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href} className={clsx(
                    'flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-extrabold',
                    active ? 'border-ink-900 bg-ink-900 text-white' : 'border-line bg-white text-navy-700',
                  )}>
                    <item.icon size={15} className={active ? 'text-brand-400' : undefined}/> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
