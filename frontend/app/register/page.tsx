'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER' as UserRole,
    companyName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidKenyanPhone(form.phone)) {
      toast.error(KENYA_PHONE_MESSAGE);
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(form);
      toast.success('Account created!');
      if (user.role === 'ORGANIZER') router.push('/organizer/dashboard');
      else router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Buy tickets or start selling your own events.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">First name</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last name</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone (e.g. 0712345678 or 0112345678)</label>
            <input
              required
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="07XXXXXXXX or 01XXXXXXXX"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">I want to</label>
            <select
              value={form.role}
              onChange={(e) => update('role', e.target.value as UserRole)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="CUSTOMER">Buy tickets (Customer)</option>
              <option value="ORGANIZER">Sell tickets (Organizer)</option>
            </select>
          </div>

          {form.role === 'ORGANIZER' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Company / Brand name</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <p className="text-xs text-gray-400">
            By signing up, you agree to our{' '}
            <Link href="/legal/terms-and-conditions" className="font-medium text-brand-600 hover:text-brand-700">
              Terms and Conditions
            </Link>
            ,{' '}
            <Link href="/legal/privacy-policy" className="font-medium text-brand-600 hover:text-brand-700">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/legal/payment-policy" className="font-medium text-brand-600 hover:text-brand-700">
              Payment Policy
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
