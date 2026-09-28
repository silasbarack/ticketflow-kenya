'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
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
    try {
      await api.get('/identity/persona/status');
      await onUpdated();
    } catch {
      await onUpdated();
    }
  }

  async function startPersona() {
    setLoading(true);
    try {
      if (onBeforeStart) await onBeforeStart();
      const [{ data }] = await Promise.all([
        api.post<PersonaSession>('/identity/persona/inquiry'),
        loadSdk(),
      ]);

      if (data.verified || data.status === 'approved') {
        await refreshStatus();
        toast.success('Identity already verified by Persona.');
        return;
      }

      if (['completed', 'needs_review'].includes(data.status)) {
        await refreshStatus();
        toast('Persona has your verification and is processing the decision.');
        return;
      }

      if (['declined', 'failed'].includes(data.status)) {
        await refreshStatus();
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
        onReady: () => client.open(),
        onComplete: async () => {
          await refreshStatus();
          toast.success('Persona verification submitted.');
          client.destroy();
          clientRef.current = null;
        },
        onCancel: async () => {
          await refreshStatus();
          client.destroy();
          clientRef.current = null;
        },
        onError: (error: unknown) => {
          console.error('Persona embedded flow error', error);
          toast.error('Persona verification could not continue. Please try again.');
        },
      });
      clientRef.current = client;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const readableStatus = status ? status.replaceAll('_', ' ') : null;

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-navy-900">Verify with Persona</h2>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">
            Persona performs the government-ID, selfie, liveness and identity checks inside a secure embedded verification flow.
          </p>
          {readableStatus && <p className="mt-2 text-xs font-semibold text-navy-700">Persona status: {readableStatus}</p>}
        </div>
      </div>

      {configured === false && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Persona is ready in the TicketFlow codebase but credentials have not been configured on the backend yet.
        </div>
      )}

      {!verified && (
        <Button
          type="button"
          className="mt-5"
          disabled={disabled || configured === false || configured === null}
          loading={loading}
          onClick={() => void startPersona()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Start Persona verification
        </Button>
      )}
    </section>
  );
}
