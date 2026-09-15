'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Ticket, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { isValidKenyanPhone, KENYA_PHONE_MESSAGE } from '@/lib/phone';
import { SERVICE_FEE_PERCENT } from '@/lib/fees';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string; icon: typeof Ticket }[] = [
  { value: 'CUSTOMER', label: 'Buy tickets', hint: 'Book events and hold QR tickets', icon: Ticket },
  { value: 'ORGANIZER', label: 'Sell tickets', hint: 'Publish events and take payments', icon: Store },
];

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  const panelPoints =
    form.role === 'ORGANIZER'
      ? [
          'Publish an event with Early Bird, Regular, Student, VIP and VVIP tiers.',
          `You keep 100% of the face value — buyers pay the ${SERVICE_FEE_PERCENT}% service fee.`,
          'Scan QR tickets at the gate and export attendee reports.',
        ]
      : [
          'Book any event in a few taps, without leaving TicketFlow.',
          'Pay by M-Pesa STK push — no cards, no card details.',
          'Your QR ticket arrives instantly, in your account and inbox.',
        ];

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Buy tickets, or start selling your own events."
      panelTitle={form.role === 'ORGANIZER' ? 'Sell out your next event.' : 'Kenya’s events, one tap away.'}
      panelPoints={panelPoints}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role first — it decides what the rest of the form asks for. */}
        <fieldset>
          <legend className="mb-2 block text-[13px] font-semibold text-navy-800">I want to</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLE_OPTIONS.map((option) => {
              const selected = form.role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('role', option.value)}
                  aria-pressed={selected}
                  className={`rounded-btn border p-3.5 text-left transition ${
                    selected ? 'border-brand-400 bg-brand-50/60 shadow-soft' : 'border-line bg-white hover:border-navy-300'
                  }`}
                >
                  <option.icon
                    className={`h-5 w-5 ${selected ? 'text-brand-600' : 'text-navy-400'}`}
                    aria-hidden="true"
                  />
                  <span className="mt-2 block text-sm font-bold text-navy-900">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="reg-first-name">First name</Label>
            <Input
              id="reg-first-name"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reg-last-name">Last name</Label>
            <Input
              id="reg-last-name"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <Label htmlFor="reg-phone">Phone number</Label>
          <Input
            id="reg-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
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
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {form.role === 'ORGANIZER' && (
          <div>
            <Label htmlFor="reg-company">Company / brand name</Label>
            <Input
              id="reg-company"
              required
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
            />
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted">
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
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
