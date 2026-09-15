'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, ShoppingCart, Ticket } from 'lucide-react';
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
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-white">
      <Container className="flex h-[72px] items-center justify-between gap-2">
        <Link href="/" className="shrink-0" aria-label="TicketFlow Kenya home">
          <span className="sm:hidden"><Logo variant="icon" className="h-12" /></span>
          <span className="hidden sm:inline-flex"><Logo className="h-12" wordmarkClassName="text-lg" /></span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden h-full items-center gap-6 xl:flex">
          {[['Discover events', '/events'], ['For organizers', '/#for-organizers'], ['How it works', '/#how-it-works']].map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={clsx('flex h-full items-center border-b-2 text-sm font-semibold transition', pathname === href ? 'border-brand-600 text-brand-700' : 'border-transparent text-navy-600 hover:text-brand-700')}>{label}</Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderSearch />
          <Link href="/cart" aria-label={`Cart, ${totalItems} tickets`} className="relative flex h-11 w-11 items-center justify-center rounded-btn text-navy-700 hover:bg-brand-50">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {totalItems > 0 && <span className="absolute right-0 top-0 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            {user ? <UserMenu /> : <Link href="/login" className="px-2 py-3 text-sm font-semibold text-navy-700 hover:text-brand-700">Log in</Link>}
            {user?.role !== 'ADMIN' && <Link href={user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register'} className={buttonVariants({size:'sm'})}><Ticket className="h-4 w-4" aria-hidden="true" />List an event</Link>}
          </div>
          <button type="button" aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-btn text-navy-700 hover:bg-brand-50 xl:hidden"><Menu className="h-6 w-6" aria-hidden="true" /></button>
        </div>
      </Container>
      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
