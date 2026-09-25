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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = [
    ['Home', '/'],
    ['Discover', '/events'],
    ['Categories', '/#categories'],
    ['Organizers', '/#for-organizers'],
    ['About', '/#about'],
    ['Contact', '/#contact'],
  ];

  return (
    <header className="ref-header">
      <div className="container-page ref-header-inner">
        <Link href="/" className="ref-header-logo" aria-label="TicketFlow Kenya home"><Logo className="h-12" /></Link>

        <nav className="ref-main-nav" aria-label="Primary navigation">
          {nav.map(([label, href]) => {
            const active = href === '/' ? pathname === '/' : href === '/events' ? pathname.startsWith('/events') : false;
            return <Link key={href} href={href} className={active ? 'active' : ''}>{label}</Link>;
          })}
        </nav>

        <div className="ref-header-right">
          <Link href="/events" className="ref-header-icon" aria-label="Search events"><Search size={18} /></Link>
          <Link href="/cart" className="ref-header-icon ref-cart" aria-label={'Cart with ' + totalItems + ' tickets'}>
            <ShoppingCart size={18} />
            {totalItems > 0 && <span>{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>

          <div className="ref-header-auth">
            {user ? <UserMenu /> : <>
              <Link href="/login" className="ref-login-btn">Log In</Link>
              <Link href="/register" className="ref-signup-btn">Sign Up</Link>
            </>}
          </div>

          <button type="button" className="ref-menu-btn" aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <Menu size={23} />
          </button>
        </div>
      </div>
      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
