'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, ShieldCheck, ShoppingCart, Smartphone, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import clsx from 'clsx';
import HeaderSearch from '@/components/HeaderSearch';
import UserMenu from '@/components/UserMenu';
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer';

const NAV_LINKS = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Categories', href: '/events' },
  { label: 'For Organizers', href: '/#for-organizers' },
  { label: 'How It Works', href: '/#how-it-works' },
];

function CartIcon({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ticket${count === 1 ? '' : 's'}`}
      className={clsx(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition',
        'hover:bg-navy-900/[0.06]',
        count > 0 && 'text-brand-700',
      )}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="tnum pointer-events-none absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-cream">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* Slim value strip — the three promises the whole product rests on. */}
      <div className="ember-ground hidden text-white/80 lg:block">
        <Container className="flex h-9 items-center justify-between text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
            Kenya&apos;s modern ticketing marketplace
          </span>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              M-Pesa STK Push
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              Verified organizers
            </span>
          </div>
        </Container>
      </div>

      <div className="border-b border-line bg-cream/85 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between gap-3 sm:h-[70px]">
          {/*
            The full lockup is 218px wide, and with the 140px mobile icon cluster
            it pushed the header past the viewport on a 320-360px phone. Below
            420px the mark stands on its own; the wordmark returns as soon as
            there is room for it.
          */}
          <Link href="/" className="shrink-0" aria-label="TicketFlow Kenya home">
            <span className="inline-flex min-[420px]:hidden">
              <Logo variant="icon" className="h-8" />
            </span>
            <span className="hidden min-[420px]:inline-flex">
              <Logo className="h-8 sm:h-9" />
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = link.href.startsWith('/') && !link.href.includes('#') && pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={clsx(
                    'rounded-full px-3.5 py-2 text-[14px] font-medium transition',
                    active ? 'bg-navy-900/[0.06] text-navy-900' : 'text-navy-600 hover:bg-navy-900/[0.05] hover:text-navy-900',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1.5 lg:flex">
            <HeaderSearch />
            <CartIcon count={totalItems} />

            {!user ? (
              <div className="ml-1 flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="ml-1 flex items-center gap-2">
                <UserMenu />
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    List an Event
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <HeaderSearch />
            <CartIcon count={totalItems} />
            <IconButton aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </IconButton>
          </div>
        </Container>
      </div>

      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
