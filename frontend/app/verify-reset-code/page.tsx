'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, Mail } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import Button from '@/components/ui/Button';
import VerificationCodeInput from '@/components/VerificationCodeInput';
import { useNow } from '@/hooks/useNow';
import {
  formatCountdown,
  loadResetRequest,
  ResetRequestResponse,
  ResetRequestState,
  saveResetAuth,
  saveResetRequest,
} from '@/lib/password-reset';

const PANEL_POINTS = [
  'Check your inbox — and your spam folder — for the 6-digit code.',
  'Never share the code. TicketFlow staff will never ask for it.',
  'Too many wrong tries locks the code; just request a new one.',
];

export default function VerifyResetCodePage() {
  const router = useRouter();
  const now = useNow();
  const [request, setRequest] = useState<ResetRequestState | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Reached without asking for a code first — there is nothing to verify.
  useEffect(() => {
    const stored = loadResetRequest();
    if (!stored) {
      router.replace('/forgot-password');
      return;
    }
    setRequest(stored);
  }, [router]);

  if (!request) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted" aria-live="polite">
        Loading…
      </div>
    );
  }

  const expiresIn = request.codeExpiresAt - now;
  const expired = expiresIn <= 0;
  const resendIn = request.resendAvailableAt - now;
  const canResend = resendIn <= 0 && !resending && !verifying;
  const codeComplete = /^\d{6}$/.test(code);

  async function verify(submitted: string) {
    if (!request || verifying) return;
    if (!/^\d{6}$/.test(submitted)) {
      setError('Enter all 6 digits of your verification code.');
      return;
    }
    if (expired) {
      setError('This code has expired. Request a new one below.');
      return;
    }

    setError(null);
    setVerifying(true);
    try {
      const { data } = await api.post<{ resetToken: string; expiresInSeconds: number }>(
        '/auth/password-reset/verify-code',
        { email: request.email, code: submitted },
      );
      saveResetAuth(data.resetToken, data.expiresInSeconds);
      toast.success('Code verified. Choose your new password.');
      router.push('/reset-password');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setCode('');
      setVerifying(false);
    }
  }

  async function resend() {
    if (!request || !canResend) return;
    setResending(true);
    setError(null);
    try {
      const { data } = await api.post<ResetRequestResponse>('/auth/password-reset/request', {
        email: request.email,
      });
      saveResetRequest(request.email, data);
      setRequest(loadResetRequest());
      setCode('');
      toast.success('If an account exists with this email address, a new verification code has been sent.');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Enter verification code"
      subtitle="We sent a 6-digit code to your email address."
      panelTitle="Almost there."
      panelPoints={PANEL_POINTS}
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to log in
        </Link>
      }
    >
      {/* The full address wraps rather than truncating: the user should see
          exactly where the code went, and an unbreakable line would stretch
          the form column past the edge of a phone screen. */}
      <p className="flex items-start gap-2 rounded-btn border border-line bg-cream/70 px-3.5 py-2.5 text-[13px] text-navy-700">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 break-all">
          Code sent to <strong className="font-semibold text-navy-900">{request.email}</strong>
        </span>
      </p>

      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
      >
        <div>
          <label htmlFor="reset-code-0" className="mb-2 block text-[13px] font-semibold text-navy-800">
            Verification code
          </label>
          <VerificationCodeInput
            idPrefix="reset-code"
            value={code}
            onChange={(next) => {
              setCode(next);
              if (error) setError(null);
            }}
            onComplete={(full) => void verify(full)}
            disabled={verifying || expired}
            invalid={Boolean(error)}
          />
          {error && (
            <p role="alert" className="mt-2.5 text-[13px] font-medium text-danger-600">
              {error}
            </p>
          )}
        </div>

        <p
          className={`flex items-center gap-1.5 text-[13px] ${expired ? 'font-medium text-danger-600' : 'text-muted'}`}
          aria-live="polite"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {expired ? (
            'This code has expired. Request a new one.'
          ) : (
            <span>
              Code expires in <span className="tnum font-semibold text-navy-900">{formatCountdown(expiresIn)}</span>
            </span>
          )}
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={verifying}
          disabled={!codeComplete || expired}
        >
          {verifying ? 'Verifying…' : 'Verify Code'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>

        <span className="text-muted">
          Didn&apos;t get it?{' '}
          {resendIn > 0 ? (
            <span className="tnum">Resend in {formatCountdown(resendIn)}</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={!canResend}
              className="font-semibold text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend Code'}
            </button>
          )}
        </span>
      </div>
    </AuthLayout>
  );
}
