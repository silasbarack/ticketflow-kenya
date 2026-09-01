'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const PANEL_POINTS = [
  'We email a single-use reset link to the address on your account.',
  'Your tickets and orders stay exactly where they are.',
  'Nothing changes until you set the new password.',
];

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
    <AuthLayout
      title="Forgot password"
      subtitle="We'll send you a link to set a new one."
      panelTitle="Locked out? Let's fix that."
      panelPoints={PANEL_POINTS}
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      {devToken && (
        <div className="mt-4 rounded-btn border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
          Dev mode (no email server configured): reset token is{' '}
          <Link href={`/reset-password?token=${devToken}`} className="font-semibold underline">
            {devToken}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
