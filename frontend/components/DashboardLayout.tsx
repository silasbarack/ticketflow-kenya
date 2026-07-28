'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function DashboardLayout({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <aside className="hidden w-64 flex-col border-r border-line bg-white p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-navy-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-muted">{user?.role}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-navy-600 hover:bg-navy-900/5',
                )}
              >
                <item.icon className={clsx('h-4 w-4', active && 'text-brand-600')} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-left text-sm font-medium text-navy-600 hover:bg-navy-900/5"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <div className="flex gap-2 overflow-x-auto border-b border-line bg-white p-3 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                pathname.startsWith(item.href) ? 'bg-brand-600 text-white' : 'bg-navy-900/5 text-navy-700',
              )}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
