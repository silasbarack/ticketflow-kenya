'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const PANEL_POINTS = [
  'Every ticket you have ever bought, in one place.',
  'Signed QR e-tickets, ready to scan at the gate.',
  'Re-download any PDF ticket whenever you need it.',
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      if (user.role === 'ADMIN') router.push('/admin/dashboard');
      else if (user.role === 'ORGANIZER') router.push('/organizer/dashboard');
      else router.push('/dashboard');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back to TicketFlow Kenya."
      panelTitle="Your tickets are waiting."
      panelPoints={PANEL_POINTS}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="flex justify-end text-sm">
          <Link href="/forgot-password" className="font-medium text-brand-700 hover:text-brand-800">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
