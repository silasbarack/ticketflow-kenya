'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Check, CheckCircle2, Eye, EyeOff, X } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import { Input, Label } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useNow } from '@/hooks/useNow';
import {
  clearPasswordResetState,
  formatCountdown,
  loadResetAuth,
  ResetAuthState,
} from '@/lib/password-reset';
import {
  meetsPasswordPolicy,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REQUIREMENTS,
  passwordStrength,
} from '@/lib/password';

const PANEL_POINTS = [
  'Pick something you have not used on TicketFlow before.',
  'Changing your password signs you out on every device.',
  'You will log in again with the new password.',
];

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-danger-500', 'bg-danger-500', 'bg-accent-500', 'bg-emerald-500', 'bg-emerald-600'];

/** How long the success message stays up before handing over to log in. */
const LOGIN_HANDOFF_MS = 3500;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const now = useNow();

  const [auth, setAuth] = useState<ResetAuthState | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Only reachable with an authorisation from a verified code. Typing the URL,
  // an old reset link, or a session that timed out all start over.
  useEffect(() => {
    if (done) return;
    const stored = loadResetAuth();
    if (!stored) {
      toast.error('Verify your email with a code before choosing a new password.');
      router.replace('/forgot-password');
      return;
    }
    setAuth(stored);
  }, [router, done]);

  // Read through a ref: `logout` is a fresh function every render, and this page
  // re-renders every second for its countdown — as an effect dependency it would
  // restart the hand-off timer each tick and the redirect would never fire.
  const sessionRef = useRef({ user, logout });
  sessionRef.current = { user, logout };

  // Success: show the confirmation, then send them to log in. Any session this
  // browser still holds was signed out by the reset, so drop it too.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      const { user: current, logout: signOut } = sessionRef.current;
      if (current) signOut();
      else router.replace('/login');
    }, LOGIN_HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [done, router]);

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your account is secure again."
        panelTitle="You're all set."
        panelPoints={PANEL_POINTS}
      >
        <div role="status" className="rounded-card border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-emerald-900">
            Password reset successful. You can now sign in using your new password.
          </p>
          <p className="mt-2 text-[13px] text-emerald-800/80">Taking you to log in…</p>
        </div>
        <Link href="/login" className="mt-5 block">
          <Button variant="primary" size="lg" fullWidth>
            Log in now
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (!auth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted" aria-live="polite">
        Loading…
      </div>
    );
  }

  const sessionLeft = auth.expiresAt - now;
  const sessionExpired = sessionLeft <= 0;
  const policyMet = meetsPasswordPolicy(password);
  const matches = password.length > 0 && password === confirm;
  const strength = passwordStrength(password);

  const passwordError =
    touched.password && password && !policyMet ? 'Your password does not meet all the requirements below.' : null;
  const confirmError = touched.confirm && confirm && !matches ? 'Passwords do not match.' : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (!auth || !policyMet || !matches || sessionExpired) return;

    setServerError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/reset', { resetToken: auth.resetToken, password });
      // The authorisation is spent — nothing in this tab can reuse it.
      clearPasswordResetState();
      setDone(true);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setServerError(message);
      // An invalid session will not become valid by retrying; policy errors will.
      if (/session is invalid or has expired/i.test(message)) clearPasswordResetState();
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create a new password"
      subtitle="Type your new password twice to confirm it."
      panelTitle="One new password, and you're back in."
      panelPoints={PANEL_POINTS}
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <PasswordField
            id="new-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            invalid={Boolean(passwordError)}
            describedBy="new-password-requirements"
            disabled={submitting}
            autoFocus
          />

          {password && (
            <div className="mt-2.5" aria-live="polite">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={clsx(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      strength >= step ? STRENGTH_COLORS[strength] : 'bg-navy-900/10',
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[12px] text-muted">
                Strength: <span className="font-semibold text-navy-800">{STRENGTH_LABELS[strength]}</span>
              </p>
            </div>
          )}

          <ul id="new-password-requirements" className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {PASSWORD_REQUIREMENTS.map((req) => {
              const ok = req.test(password);
              return (
                <li
                  key={req.id}
                  className={clsx('flex items-center gap-1.5 text-[12.5px]', ok ? 'text-emerald-700' : 'text-muted')}
                >
                  {ok ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                  )}
                  {req.label}
                  <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                </li>
              );
            })}
          </ul>
          {passwordError && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-danger-600">
              {passwordError}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordField
            id="confirm-password"
            value={confirm}
            onChange={setConfirm}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            invalid={Boolean(confirmError)}
            describedBy={confirmError ? 'confirm-password-error' : undefined}
            disabled={submitting}
          />
          {confirmError ? (
            <p id="confirm-password-error" role="alert" className="mt-2 text-[13px] font-medium text-danger-600">
              {confirmError}
            </p>
          ) : (
            confirm &&
            matches && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Passwords match
              </p>
            )
          )}
        </div>

        {serverError && (
          <div role="alert" className="rounded-btn border border-danger-200 bg-danger-50 p-3.5 text-[13px] text-danger-700">
            {serverError}
            {/session is invalid or has expired/i.test(serverError) && (
              <>
                {' '}
                <Link href="/forgot-password" className="font-semibold underline">
                  Request a new code
                </Link>
              </>
            )}
          </div>
        )}

        <p className={clsx('text-[12.5px]', sessionExpired ? 'font-medium text-danger-600' : 'text-muted')}>
          {sessionExpired ? (
            <>
              Your reset session has expired.{' '}
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new code
              </Link>
            </>
          ) : (
            <>
              For your security, this page expires in{' '}
              <span className="tnum font-semibold text-navy-800">{formatCountdown(sessionLeft)}</span>.
            </>
          )}
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!policyMet || !matches || sessionExpired}
        >
          {submitting ? 'Updating password…' : 'Reset Password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  onBlur,
  visible,
  onToggle,
  invalid,
  describedBy,
  disabled,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  visible: boolean;
  onToggle: () => void;
  invalid: boolean;
  describedBy?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        autoFocus={autoFocus}
        className={clsx('pr-12', invalid && 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/10')}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-btn text-muted transition hover:text-navy-900"
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
