'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, ShoppingCart, Ticket, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Logo from '@/components/Logo';
import Container from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import HeaderSearch from '@/components/HeaderSearch';
import UserMenu from '@/components/UserMenu';
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer';
import clsx from 'clsx';

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    ['Discover', '/events'],
    ['For organizers', '/#for-organizers'],
    ['How it works', '/#how-it-works'],
  ];

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/90">
      <Container className="flex h-[66px] items-center justify-between gap-2 sm:h-[76px]">
        <Link href="/" className="flex shrink-0 items-center" aria-label="TicketFlow Kenya home">
          <span className="sm:hidden"><Logo variant="icon" className="h-10" /></span>
          <span className="hidden sm:inline-flex"><Logo className="h-11" wordmarkClassName="text-lg" /></span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden h-full items-center gap-1 xl:flex">
          {links.map(([label, href]) => {
            const active = href === '/events' && pathname.startsWith('/events');
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          <div className="hidden md:block"><HeaderSearch /></div>

          <Link
            href="/cart"
            aria-label={`Cart, ${totalItems} tickets`}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-transparent text-navy-700 transition hover:border-line hover:bg-white hover:shadow-soft"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-brand-600 px-1 text-[10px] font-extrabold text-white">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <UserMenu />
            ) : (
              <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-navy-700 hover:bg-navy-50">
                Log in
              </Link>
            )}
            {user?.role !== 'ADMIN' && (
              <Link href={user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register'} className={buttonVariants({size:'sm', className:'rounded-full'})}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                List an event
              </Link>
            )}
          </div>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy-700 transition hover:bg-brand-50 xl:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <div className="border-t border-line/70 px-4 py-2 md:hidden">
        <div className="mx-auto max-w-[1320px]"><HeaderSearch /></div>
      </div>

      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
