'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { LayoutDashboard, LogOut, Palette, Ticket, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';

const NAV_LINKS = [
  { label: 'Discover events', href: '/events' },
  { label: 'Events in Nairobi', href: '/events?city=Nairobi' },
  { label: 'For Organizers', href: '/#for-organizers' },
  { label: 'How It Works', href: '/#how-it-works' },
];

export default function MobileNavigationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ORGANIZER' ? '/organizer/dashboard' : '/dashboard';

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-[3px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="absolute inset-y-0 right-0 flex w-[88vw] max-w-[390px] flex-col bg-white shadow-elevated"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo className="h-9" wordmarkClassName="text-sm" />
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-navy-600 hover:bg-navy-900/5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="rounded-2xl px-4 py-3 text-base font-bold text-navy-800 transition hover:bg-brand-50 hover:text-brand-700"
              style={{ minHeight: 44 }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mobile-safe-area mt-auto border-t border-line bg-cream/60 px-3 py-4">
          {user ? (
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-2">
                <p className="truncate text-sm font-semibold text-navy-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <DrawerLink href="/dashboard/tickets" icon={<Ticket className="h-5 w-5" aria-hidden="true" />} onNavigate={onClose}>
                My Tickets
              </DrawerLink>
              <DrawerLink href={dashboardHref} icon={<LayoutDashboard className="h-5 w-5" aria-hidden="true" />} onNavigate={onClose}>
                Dashboard
              </DrawerLink>
              <DrawerLink href="/settings/appearance" icon={<Palette className="h-5 w-5" aria-hidden="true" />} onNavigate={onClose}>
                Appearance
              </DrawerLink>
              <DrawerLink href="/settings/account" icon={<UserIcon className="h-5 w-5" aria-hidden="true" />} onNavigate={onClose}>
                Account Settings
              </DrawerLink>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-base font-semibold text-navy-700 hover:bg-navy-900/5"
                style={{ minHeight: 44 }}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 px-1">
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" fullWidth size="lg">
                  Log in
                </Button>
              </Link>
              <Link href="/register" onClick={onClose}>
                <Button variant="primary" fullWidth size="lg">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerLink({
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
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-base font-semibold text-navy-800 hover:bg-brand-50 hover:text-brand-700"
      style={{ minHeight: 44 }}
    >
      {icon}
      {children}
    </Link>
  );
}
