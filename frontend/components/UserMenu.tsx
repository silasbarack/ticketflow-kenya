'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, LogOut, Palette, Ticket, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function dashboardLabelAndHref(role: string | undefined) {
  if (role === 'ADMIN') return { label: 'Admin Dashboard', href: '/admin/dashboard' };
  if (role === 'ORGANIZER') return { label: 'Organizer Dashboard', href: '/organizer/dashboard' };
  return { label: 'My Dashboard', href: '/dashboard' };
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
  const dashboard = dashboardLabelAndHref(user.role);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.firstName}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white transition hover:bg-navy-800"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-elevated"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <nav className="py-1.5">
            <MenuLink href="/dashboard/tickets" icon={<Ticket className="h-4 w-4" aria-hidden="true" />} onNavigate={() => setOpen(false)}>
              My Tickets
            </MenuLink>
            <MenuLink href={dashboard.href} icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />} onNavigate={() => setOpen(false)}>
              {dashboard.label}
            </MenuLink>
            <MenuLink href="/settings/appearance" icon={<Palette className="h-4 w-4" aria-hidden="true" />} onNavigate={() => setOpen(false)}>
              Appearance
            </MenuLink>
            <MenuLink href="/settings/account" icon={<UserIcon className="h-4 w-4" aria-hidden="true" />} onNavigate={() => setOpen(false)}>
              Account Settings
            </MenuLink>
          </nav>

          <div className="border-t border-line pt-1.5">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-navy-700 hover:bg-navy-900/5"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-900/5"
    >
      {icon}
      {children}
    </Link>
  );
}
