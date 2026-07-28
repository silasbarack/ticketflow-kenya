'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import Container from '@/components/ui/Container';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">Log in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to TicketFlow Kenya.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end text-sm">
            <Link href="/forgot-password" className="font-medium text-brand-700 hover:text-brand-800">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign up
          </Link>
        </p>
      </div>
    </Container>
  );
}
