'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { clearPasswordResetState, EMAIL_PATTERN, ResetRequestResponse, saveResetRequest } from '@/lib/password-reset';

const PANEL_POINTS = [
  'We email a 6-digit verification code to the address on your account.',
  'The code expires in 10 minutes and works only once.',
  'Your tickets and orders stay exactly where they are.',
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<ResetRequestResponse>('/auth/password-reset/request', { email: trimmed });
      // A fresh request supersedes any half-finished reset in this tab.
      clearPasswordResetState();
      saveResetRequest(trimmed, data);
      toast.success(data.message);
      router.push('/verify-reset-code');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a verification code."
      panelTitle="Locked out? Let's fix that."
      panelPoints={PANEL_POINTS}
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="forgot-email">Email address</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'forgot-email-error' : undefined}
            disabled={submitting}
          />
          {error && (
            <p id="forgot-email-error" role="alert" className="mt-2 text-[13px] font-medium text-danger-600">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} disabled={!email.trim()}>
          {submitting ? 'Sending code…' : 'Send Verification Code'}
        </Button>
      </form>
    </AuthLayout>
  );
}
