'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Logo from '@/components/Logo';
import UserMenu from '@/components/UserMenu';
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer';

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fresh-header">
      <div className="container-page fresh-header-inner">
        <Link href="/" className="fresh-logo" aria-label="TicketFlow Kenya home">
          <span className="fresh-logo-desktop"><Logo className="h-10" wordmarkClassName="text-[17px]" /></span>
          <span className="fresh-logo-mobile"><Logo variant="icon" className="h-9" /></span>
        </Link>

        <nav className="fresh-desktop-nav" aria-label="Primary">
          <Link href="/events" className={pathname.startsWith('/events') ? 'active' : ''}>Events</Link>
          <Link href="/events?city=Nairobi">Nairobi</Link>
          <Link href="/#for-organizers">For organizers</Link>
        </nav>

        <form action="/events" className="fresh-header-search">
          <Search size={17} />
          <input name="q" placeholder="Search events" aria-label="Search events" />
        </form>

        <div className="fresh-header-actions">
          <Link href="/cart" className="fresh-icon-button" aria-label={'Cart with ' + totalItems + ' tickets'}>
            <ShoppingCart size={20} />
            {totalItems > 0 && <span>{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>
          <div className="fresh-account-area">
            {user ? <UserMenu /> : <Link href="/login" className="fresh-login">Log in</Link>}
            {user?.role !== 'ADMIN' && <Link href={user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register'} className="fresh-list-event">List event</Link>}
          </div>
          <button type="button" className="fresh-menu-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={23} /></button>
        </div>
      </div>
      <MobileNavigationDrawer open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
