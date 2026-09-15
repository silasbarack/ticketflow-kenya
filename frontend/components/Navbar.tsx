'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { label: 'Discover', href: '/events' },
  { label: 'Nairobi', href: '/events?city=Nairobi' },
  { label: 'For Organizers', href: '/#for-organizers' },
  { label: 'How It Works', href: '/#how-it-works' },
];

function CartIcon({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ticket${count === 1 ? '' : 's'}`}
      className={clsx(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/[0.06]',
        count > 0 && 'text-brand-700',
      )}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="tnum pointer-events-none absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
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
  const organizerHref = user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-xl">
      <Container className="flex h-[76px] items-center justify-between gap-3">
        <Link href="/" className="shrink-0" aria-label="TicketFlow Kenya home">
          <span className="inline-flex min-[420px]:hidden">
            <Logo variant="icon" className="h-8" />
          </span>
          <span className="hidden min-[420px]:inline-flex">
            <Logo className="h-8 sm:h-9" />
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => {
            const active = !link.href.includes('?') && !link.href.includes('#') && pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'rounded-full px-3.5 py-2 text-[14px] font-semibold transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-navy-600 hover:bg-navy-900/[0.045] hover:text-navy-900',
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
              <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link href="/register"><Button variant="primary" size="sm">Create account</Button></Link>
            </div>
          ) : (
            <div className="ml-1 flex items-center gap-2">
              <UserMenu />
              {user.role !== 'ADMIN' && (
                <Link href={organizerHref}><Button variant="outline" size="sm">List an event</Button></Link>
              )}
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

      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
