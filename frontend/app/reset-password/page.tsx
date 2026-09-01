'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const PANEL_POINTS = [
  'Choose something at least 8 characters long.',
  'The reset token can only be used once.',
  'You will be asked to log in again with the new password.',
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Password reset. Please log in.');
      router.push('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Set a new password for your account."
      panelTitle="One new password, and you're back in."
      panelPoints={PANEL_POINTS}
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reset-token">Reset token</Label>
          <Input
            id="reset-token"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token from your email"
          />
        </div>
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
