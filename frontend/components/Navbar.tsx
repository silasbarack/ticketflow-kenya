'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Logo from '@/components/Logo';
import UserMenu from '@/components/UserMenu';
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer';
import { PRIMARY_NAV } from '@/lib/nav';

export default function Navbar() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={clsx('tf-header', scrolled && 'scrolled')}>
      <div className="container-page tf-header-inner">
        <Link href="/" className="tf-header-logo" aria-label="TicketFlow Kenya home">
          <Logo className="h-full" />
        </Link>

        <nav className="tf-nav" aria-label="Primary navigation">
          {PRIMARY_NAV.map(({ label, href }) => {
            const active = href === '/' ? pathname === '/' : href === '/events' ? pathname.startsWith('/events') : false;
            return <Link key={label} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>{label}</Link>;
          })}
        </nav>

        <div className="tf-header-right">
          <Link href="/events" className="tf-icon-btn" aria-label="Search events"><Search size={19} /></Link>
          <Link href="/cart" className="tf-icon-btn" aria-label={'Cart with ' + totalItems + ' tickets'}>
            <ShoppingCart size={19} />
            {totalItems > 0 && <span key={totalItems} className="tf-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>

          <div className="tf-auth">
            {user ? <UserMenu /> : (
              <>
                <Link href="/login" className="tf-login-btn">Log In</Link>
                <Link href="/register" className="tf-signup-btn tf-shine">Sign Up</Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="tf-icon-btn tf-menu-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={23} />
          </button>
        </div>
      </div>
      <MobileNavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
