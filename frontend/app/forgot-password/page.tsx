'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import Container from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message);
      if (data.devToken) setDevToken(data.devToken);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">We&apos;ll send you a reset link.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        {devToken && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            Dev mode (no email server configured): reset token is{' '}
            <Link href={`/reset-password?token=${devToken}`} className="font-semibold underline">
              {devToken}
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Back to login
          </Link>
        </p>
      </div>
    </Container>
  );
}
