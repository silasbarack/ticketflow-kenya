'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, ShoppingCart } from 'lucide-react';
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
        'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/5',
      )}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="pointer-events-none absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-3 sm:h-[72px]">
        <Link href="/" className="shrink-0" aria-label="TicketFlow Kenya home">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] font-medium text-navy-700 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
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
                <Button variant="outline" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          ) : (
            <div className="ml-1">
              <UserMenu />
            </div>
          )}

          <Link href="/register" className="ml-1">
            <Button variant="primary" size="sm">
              List an Event
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <HeaderSearch />
          <CartIcon count={totalItems} />
          <IconButton aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </IconButton>
        </div>
      </Container>

      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
