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

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#f7f8fa]">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[260px] shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
          <div className="border-b border-line px-2 pb-5">
            <Link href="/" aria-label="TicketFlow Kenya home"><Logo className="h-11" /></Link>
            <p className="mt-3 text-sm font-black text-navy-900">{user?.firstName} {user?.lastName}</p>
            <p className="mt-1 text-xs text-muted">{user?.role === 'ADMIN' ? 'Platform administration' : 'Organizer workspace'}</p>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href} className={clsx(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-extrabold transition duration-200 hover:translate-x-0.5',
                  active ? 'bg-brand-600 text-white shadow-glow' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                )}>
                  <item.icon className="h-[18px] w-[18px]" /> {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-line pt-4">
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm text-muted hover:bg-navy-50"><ArrowLeft size={18}/> Back to TicketFlow</Link>
            <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm text-muted hover:bg-navy-50"><LogOut size={18}/> Log out</button>
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
                    active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-navy-700',
                  )}>
                    <item.icon size={15}/> {item.label}
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
