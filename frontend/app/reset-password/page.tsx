'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import Container from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">Reset password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token" aria-label="Reset token" />
          <Input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            aria-label="New password"
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      </div>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
