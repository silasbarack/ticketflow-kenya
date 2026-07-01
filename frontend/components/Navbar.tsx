'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ORGANIZER' ? '/organizer/dashboard' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/">
          <Logo gradientId="tfk-logo-nav" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 md:flex">
          <Link href="/events" className="hover:text-brand-600">
            Browse Events
          </Link>
          {user && (
            <Link href={dashboardHref} className="hover:text-brand-600">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!user ? (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-600">Hi, {user.firstName}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Log out
              </button>
            </>
          )}
        </div>

        <button className="p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-700">
            <Link href="/events" onClick={() => setOpen(false)}>
              Browse Events
            </Link>
            {user ? (
              <>
                <Link href={dashboardHref} onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={logout} className="text-left text-red-600">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="font-semibold text-brand-600">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
