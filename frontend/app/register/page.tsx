'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';
import Container from '@/components/ui/Container';
import { Input, Label, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Buy tickets or start selling your own events.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reg-first-name">First name</Label>
              <Input id="reg-first-name" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="reg-last-name">Last name</Label>
              <Input id="reg-last-name" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="reg-email">Email</Label>
            <Input id="reg-email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>

          <div>
            <Label htmlFor="reg-phone">Phone (e.g. 0712345678 or 0112345678)</Label>
            <Input
              id="reg-phone"
              required
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="07XXXXXXXX or 01XXXXXXXX"
            />
          </div>

          <div>
            <Label htmlFor="reg-password">Password</Label>
            <Input
              id="reg-password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="reg-role">I want to</Label>
            <Select id="reg-role" value={form.role} onChange={(e) => update('role', e.target.value as UserRole)}>
              <option value="CUSTOMER">Buy tickets (Customer)</option>
              <option value="ORGANIZER">Sell tickets (Organizer)</option>
            </Select>
          </div>

          {form.role === 'ORGANIZER' && (
            <div>
              <Label htmlFor="reg-company">Company / Brand name</Label>
              <Input id="reg-company" required value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
            </div>
          )}

          <p className="text-xs text-muted">
            By signing up, you agree to our{' '}
            <Link href="/legal/terms-and-conditions" className="font-medium text-brand-700 hover:text-brand-800">
              Terms and Conditions
            </Link>
            ,{' '}
            <Link href="/legal/privacy-policy" className="font-medium text-brand-700 hover:text-brand-800">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/legal/payment-policy" className="font-medium text-brand-700 hover:text-brand-800">
              Payment Policy
            </Link>
            .
          </p>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
        </p>
      </div>
    </Container>
  );
}
