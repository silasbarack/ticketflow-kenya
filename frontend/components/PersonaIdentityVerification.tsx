'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  ExternalLink,
  IdCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';

declare global {
  interface Window {
    Persona?: {
      Client: new (options: Record<string, unknown>) => {
        open: () => void;
        destroy: () => void;
      };
    };
  }
}

const PERSONA_SDK = 'https://cdn.withpersona.com/dist/persona-v5.8.0.js';

type PersonaSession = {
  inquiryId: string;
  sessionToken?: string | null;
  environmentId: string;
  status: string;
  verified: boolean;
};

type Screen = 'idle' | 'intro' | 'launching' | 'processing' | 'success';

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PersonaIdentityVerification({
  verified,
  status,
  disabled,
  onBeforeStart,
  onUpdated,
}: {
  verified?: boolean;
  status?: string | null;
  disabled?: boolean;
  onBeforeStart?: () => Promise<unknown> | unknown;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const clientRef = useRef<{ destroy: () => void } | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/identity/persona/configuration')
      .then(({ data }) => {
        if (active) setConfigured(Boolean(data?.configured));
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (verified) setScreen('idle');
  }, [verified]);

  function loadSdk() {
    return new Promise<void>((resolve, reject) => {
      if (window.Persona?.Client) {
        resolve();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>('script[data-ticketflow-persona-sdk="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load Persona verification.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = PERSONA_SDK;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.ticketflowPersonaSdk = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Persona verification.'));
      document.head.appendChild(script);
    });
  }

  async function refreshStatus() {
    const { data } = await api.get('/identity/persona/status');
    await onUpdated();
    return data as { verified?: boolean; status?: string | null };
  }

  async function processCompletedInquiry() {
    setScreen('processing');

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const result = await refreshStatus();
        if (result.verified || result.status === 'approved') {
          setScreen('success');
          await sleep(1000);
          setScreen('idle');
          return;
        }
        if (['declined', 'failed'].includes(String(result.status || ''))) {
          setScreen('idle');
          toast.error('Persona could not verify this identity. Review the status and try again if allowed.');
          return;
        }
      } catch {
        // Webhooks can arrive just after the embedded flow completes. Retry briefly.
      }
      await sleep(1100);
    }

    await onUpdated();
    setScreen('idle');
    toast('Verification submitted. TicketFlow will update the result when Persona finishes processing.');
  }

  async function startPersona() {
    setLoading(true);
    setScreen('launching');

    try {
      if (onBeforeStart) await onBeforeStart();

      const [{ data }] = await Promise.all([
        api.post<PersonaSession>('/identity/persona/inquiry'),
        loadSdk(),
      ]);

      if (data.verified || data.status === 'approved') {
        await refreshStatus();
        setScreen('success');
        await sleep(900);
        setScreen('idle');
        return;
      }

      if (['completed', 'needs_review'].includes(data.status)) {
        await processCompletedInquiry();
        return;
      }

      if (['declined', 'failed'].includes(data.status)) {
        await refreshStatus();
        setScreen('idle');
        toast.error('This Persona inquiry needs review before another attempt.');
        return;
      }

      if (!window.Persona?.Client) throw new Error('Persona SDK did not initialize.');

      clientRef.current?.destroy();
      let client: any;

      client = new window.Persona.Client({
        inquiryId: data.inquiryId,
        environmentId: data.environmentId,
        ...(data.sessionToken ? { sessionToken: data.sessionToken } : {}),
        styleVariant: 'light',
        onReady: () => {
          setScreen('idle');
          client.open();
        },
        onComplete: async () => {
          client.destroy();
          clientRef.current = null;
          await processCompletedInquiry();
        },
        onCancel: async () => {
          try {
            await refreshStatus();
          } catch {
            await onUpdated();
          }
          client.destroy();
          clientRef.current = null;
          setScreen('idle');
        },
        onError: (error: unknown) => {
          console.error('Persona embedded flow error', error);
          setScreen('idle');
          toast.error('Persona verification could not continue. Please try again.');
        },
      });

      clientRef.current = client;
    } catch (error) {
      setScreen('idle');
      toast.error(error instanceof Error ? error.message : getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const readableStatus = status ? status.replaceAll('_', ' ') : null;

  return (
    <>
      <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-navy-900">Live identity verification</h2>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              Complete a live selfie and government-ID check securely through Persona.
            </p>
            {readableStatus && <p className="mt-2 text-xs font-semibold text-navy-700">Persona status: {readableStatus}</p>}
          </div>
        </div>

        {configured === false && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Persona is integrated but has not been activated with TicketFlow&apos;s Persona credentials yet.
          </div>
        )}

        {!verified && (
          <Button
            type="button"
            className="mt-5"
            disabled={disabled || configured === false || configured === null}
            onClick={() => setScreen('intro')}
          >
            <Camera className="h-4 w-4" />
            Start live verification
          </Button>
        )}
      </section>

      {screen === 'intro' && (
        <div className="fixed inset-0 z-[160] overflow-y-auto bg-white">
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={() => setScreen('idle')}
              className="grid h-11 w-11 place-items-center rounded-full text-navy-800 hover:bg-navy-50"
              aria-label="Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <div className="flex flex-1 flex-col justify-center py-8">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand-600">
                <ShieldCheck className="h-9 w-9" />
              </span>

              <h1 className="mt-7 text-center text-3xl font-black tracking-[-0.035em] text-ink-950">
                Verify your identity to continue
              </h1>

              <div className="mt-8 space-y-5">
                <IntroRow
                  icon={<ShieldCheck className="h-5 w-5" />}
                  text="Persona provides identity verification for use on TicketFlow Kenya."
                />
                <IntroRow
                  icon={<Camera className="h-5 w-5" />}
                  text="You may be asked to take a live selfie and move your face slightly left and right."
                />
                <IntroRow
                  icon={<IdCard className="h-5 w-5" />}
                  text="You’ll need a valid government-issued identity document."
                />
                <IntroRow
                  icon={<Clock3 className="h-5 w-5" />}
                  text="The process normally takes only a few minutes."
                />
              </div>

              <div className="mt-8 rounded-2xl bg-navy-50 p-4 text-xs leading-5 text-navy-700">
                <div className="flex gap-2">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <p>
                    Your verification is handled securely by Persona. TicketFlow uses the verification result to determine whether the authorized representative has completed identity verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="mobile-safe-area">
              <Button type="button" fullWidth size="lg" loading={loading} onClick={() => void startPersona()}>
                <ExternalLink className="h-4 w-4" />
                Verify with Persona
              </Button>
              <button
                type="button"
                className="mt-3 min-h-11 w-full rounded-xl text-sm font-bold text-muted hover:bg-navy-50 hover:text-navy-900"
                onClick={() => setScreen('idle')}
              >
                Not now
              </button>
              <p className="mt-4 text-center text-[11px] leading-5 text-muted">
                Continuing opens Persona&apos;s secure embedded verification flow.
              </p>
            </div>
          </div>
        </div>
      )}

      {screen === 'launching' && (
        <VerificationState
          title="Getting verification ready"
          text="Preparing the live camera and secure Persona verification session…"
        />
      )}

      {screen === 'processing' && (
        <VerificationState
          title="Verifying…"
          text="Persona is checking the live selfie, liveness signals and identity document."
          blurred
        />
      )}

      {screen === 'success' && (
        <div className="fixed inset-0 z-[170] grid place-items-center bg-white p-6">
          <div className="w-full max-w-sm text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <h1 className="mt-6 text-3xl font-black tracking-[-0.035em] text-ink-950">Identity verified</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Persona approved this identity verification.</p>
          </div>
        </div>
      )}
    </>
  );
}

function IntroRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">{icon}</span>
      <p className="pt-1 text-sm leading-6 text-navy-800">{text}</p>
    </div>
  );
}

function VerificationState({
  title,
  text,
  blurred,
}: {
  title: string;
  text: string;
  blurred?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[165] overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-[58vh] bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300">
        {blurred ? (
          <div className="absolute inset-0 scale-110 bg-[radial-gradient(circle_at_50%_38%,rgba(139,123,112,.5),transparent_23%),radial-gradient(circle_at_50%_72%,rgba(69,89,105,.45),transparent_28%),linear-gradient(135deg,#d6d3d1,#e7e5e4)] blur-2xl" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-black">
            <span className="h-16 w-16 animate-spin rounded-full border-[5px] border-white/25 border-t-white" />
          </div>
        )}
        {blurred && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white shadow-xl">{title}</span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 min-h-[42vh] bg-white px-6 py-9 text-center">
        {!blurred && <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" />}
        <h1 className="mt-4 text-2xl font-black tracking-[-0.025em] text-ink-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}
