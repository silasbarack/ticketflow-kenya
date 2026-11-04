'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Copy, Sparkles, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyText } from '@/lib/ai';

/** Marks content as machine-written. Shown on every AI output, everywhere. */
export function AiBadge({ className, label = 'AI-generated' }: { className?: string; label?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/** "Review before you use this" strip that sits on top of every draft. */
export function AiReviewNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-3 text-xs leading-relaxed text-violet-900">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        {children ?? 'This is an AI draft. Check every fact before using it — nothing is published or changed until you do it yourself.'}
      </p>
    </div>
  );
}

/** Server-side claim checks (invented prices, discounts, performers…). */
export function AiWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings?.length) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
      <p className="flex items-center gap-1.5 font-extrabold">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Check before using
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 leading-relaxed">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shown when a feature is switched off or the provider is down. */
export function AiUnavailable({ title = 'AI assistant unavailable', message }: { title?: string; message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-dashed border-line bg-white px-4 py-4 text-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900/5 text-navy-400">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="font-bold text-navy-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {message ?? 'This AI feature isn\'t available right now — it may be switched off or not configured. Everything else works as normal.'}
        </p>
      </div>
    </div>
  );
}

/** Animated placeholder while a model is writing. */
export function AiGenerating({ label = 'Drafting with AI…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 rounded-card border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-violet-900">
        <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
        {label}
      </p>
      {[92, 78, 85, 60].map((w) => (
        <div key={w} className="h-3 animate-pulse rounded-full bg-violet-100" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function Percent({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <>—</>;
  return <>{Math.round(value * 100)}%</>;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        if (await copyText(text)) toast.success('Copied');
        else toast.error('Copy failed — select the text instead');
      }}
      className="rounded-lg p-1.5 text-navy-400 transition hover:bg-navy-900/5 hover:text-navy-900"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
