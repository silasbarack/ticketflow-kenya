'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, LayoutDashboard, LogOut, Palette, Ticket, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import { PRIMARY_NAV } from '@/lib/nav';

/**
 * Site navigation as its own page. The header's menu button links here rather
 * than opening an overlay, so the menu never covers the page being read.
 */
export default function MenuPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ORGANIZER' ? '/organizer/dashboard' : '/dashboard';

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <main className="container-page max-w-xl py-8">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>

      <h1 className="page-title">Menu</h1>

      <nav aria-label="Site navigation" className="mt-6 overflow-hidden rounded-card border border-line bg-white">
        {PRIMARY_NAV.map((link) => (
          <MenuLink key={link.label} href={link.href === '#contact' ? '/#contact' : link.href}>
            {link.label}
          </MenuLink>
        ))}
      </nav>

      <section aria-label="Account" className="mt-6 overflow-hidden rounded-card border border-line bg-white">
        {user ? (
          <>
            <div className="border-b border-line px-5 py-4">
              <p className="truncate text-base font-bold text-navy-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
            <MenuLink href="/dashboard/tickets" icon={<Ticket className="h-5 w-5" aria-hidden="true" />}>My Tickets</MenuLink>
            <MenuLink href={dashboardHref} icon={<LayoutDashboard className="h-5 w-5" aria-hidden="true" />}>Dashboard</MenuLink>
            <MenuLink href="/settings/appearance" icon={<Palette className="h-5 w-5" aria-hidden="true" />}>Appearance</MenuLink>
            <MenuLink href="/settings/account" icon={<UserIcon className="h-5 w-5" aria-hidden="true" />}>Account Settings</MenuLink>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex w-full items-center gap-3 px-5 py-4 text-left text-base font-semibold text-brand-700 hover:bg-brand-50"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Log Out
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2.5 p-5">
            <Link href="/login">
              <Button variant="outline" fullWidth size="lg">Log in</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" fullWidth size="lg">Sign up</Button>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-line px-5 py-4 text-base font-semibold text-navy-800 last:border-b-0 hover:bg-brand-50 hover:text-brand-700"
    >
      {icon}
      <span className="flex-1">{children}</span>
      <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
    </Link>
  );
}
