'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export default function DashboardLayout({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-gray-50">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
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
                  active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-4 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Log out
        </button>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white p-3 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                pathname.startsWith(item.href) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
