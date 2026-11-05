'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginUrlFor } from '@/lib/safe-redirect';
import { buttonVariants } from '@/components/ui/Button';

/**
 * The short admin address: /admin. Admins land on the dashboard; signed-out
 * visitors sign in and come straight back; anyone else is told plainly that
 * this area is for administrators.
 */
export default function AdminEntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(loginUrlFor('/admin'));
    else if (user.role === 'ADMIN') router.replace('/admin/dashboard');
  }, [user, loading, router]);

  if (loading || !user || user.role === 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-muted" role="status">
        Opening the admin portal…
      </div>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md rounded-card border border-line bg-white p-7 text-center shadow-soft">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-navy-900">Administrators only</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You&apos;re signed in as {user.email}, which isn&apos;t an admin account. Sign in with an administrator account to open the admin portal.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={user.role === 'ORGANIZER' ? '/organizer/dashboard' : '/dashboard'} className={buttonVariants({ size: 'sm' })}>Go to my dashboard</Link>
          <Link href="/" className={buttonVariants({ size: 'sm', variant: 'outline' })}>Home</Link>
        </div>
      </div>
    </main>
  );
}
