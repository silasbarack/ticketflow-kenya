'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Cpu, DollarSign, Gauge } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Button from '@/components/ui/Button';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { ADMIN_NAV as NAV } from '@/lib/admin-nav';

interface FeatureSetting {
  feature: string; label: string; description: string; audience: string;
  enabled: boolean; dailyRequestLimit: number; perUserDailyLimit: number; monthlyBudgetUsd: number; updatedAt: string | null;
}
interface SettingsResponse { globallyEnabled: boolean; providerConfigured: boolean; provider: string; model: string; features: FeatureSetting[] }
interface UsageResponse {
  days: number;
  features: { feature: string; label: string; requests: number; inputTokens: number; outputTokens: number; costUsd: number; monthToDateCostUsd: number; statuses: Record<string, number> }[];
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

function SettingsContent() {
  const settings = useQuery({ queryKey: ['ai-settings'], queryFn: async () => (await api.get<SettingsResponse>('/admin/ai/settings')).data });
  const usage = useQuery({ queryKey: ['ai-usage'], queryFn: async () => (await api.get<UsageResponse>('/admin/ai/usage')).data });

  const totals = (usage.data?.features ?? []).reduce(
    (t, f) => ({ requests: t.requests + f.requests, cost: t.cost + f.costUsd, month: t.month + f.monthToDateCostUsd, tokens: t.tokens + f.inputTokens + f.outputTokens }),
    { requests: 0, cost: 0, month: 0, tokens: 0 },
  );
  const s = settings.data;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Platform controls" title="AI Settings" description="Switch each AI feature on or off and set usage and spend limits. API keys live only on the server." />

      {s && (!s.globallyEnabled || !s.providerConfigured) && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {!s.globallyEnabled ? <>AI is switched off for this environment (<code>AI_ENABLED</code> is not <code>true</code>). </> : null}
            {!s.providerConfigured ? <>The AI provider has no API key (<code>ANTHROPIC_API_KEY</code>). </> : null}
            Features below stay unavailable until the server is configured; everything else on TicketFlow works normally.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard loading={!s} label="Provider" value={s ? s.provider : ''} icon={Cpu} hint={s?.model} />
        <MetricCard loading={!usage.data} label="Requests (30 days)" value={totals.requests} icon={Gauge} hint={`${totals.tokens.toLocaleString()} tokens`} />
        <MetricCard loading={!usage.data} label="Estimated cost (30 days)" value={usd(totals.cost)} icon={DollarSign} hint="From list prices — your invoice is authoritative" />
        <MetricCard loading={!usage.data} label="Month to date" value={usd(totals.month)} icon={DollarSign} tone="brand" />
      </div>

      {settings.isLoading ? <Skeleton className="mt-6 h-96 rounded-card" /> : settings.isError ? <div className="mt-6"><ErrorState onRetry={() => settings.refetch()} /></div> : (
        <ul className="mt-6 space-y-4">
          {s!.features.map((f) => <FeatureRow key={f.feature} setting={f} usage={usage.data?.features.find((u) => u.feature === f.feature)} />)}
        </ul>
      )}
    </DashboardLayout>
  );
}

function FeatureRow({ setting, usage }: { setting: FeatureSetting; usage?: UsageResponse['features'][number] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(setting);
  useEffect(() => setForm(setting), [setting]);
  const dirty = form.enabled !== setting.enabled || form.dailyRequestLimit !== setting.dailyRequestLimit || form.perUserDailyLimit !== setting.perUserDailyLimit || form.monthlyBudgetUsd !== setting.monthlyBudgetUsd;

  const save = useMutation({
    mutationFn: async (patch: Partial<FeatureSetting>) =>
      (await api.patch(`/admin/ai/settings/${setting.feature}`, {
        enabled: patch.enabled, dailyRequestLimit: patch.dailyRequestLimit, perUserDailyLimit: patch.perUserDailyLimit, monthlyBudgetUsd: patch.monthlyBudgetUsd,
      })).data,
    onSuccess: () => { toast.success(`${setting.label} updated`); qc.invalidateQueries({ queryKey: ['ai-settings'] }); qc.invalidateQueries({ queryKey: ['ai-availability'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const budgetUsed = setting.monthlyBudgetUsd > 0 && usage ? usage.monthToDateCostUsd / setting.monthlyBudgetUsd : 0;
  const blocked = usage ? (usage.statuses.BLOCKED_LIMIT ?? 0) + (usage.statuses.BLOCKED_BUDGET ?? 0) : 0;
  const failed = usage ? (usage.statuses.PROVIDER_ERROR ?? 0) + (usage.statuses.INVALID_OUTPUT ?? 0) + (usage.statuses.REFUSED ?? 0) : 0;

  return (
    <li className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="font-extrabold text-navy-900">{setting.label} <span className="ml-1 text-xs font-semibold text-muted">· {setting.audience}</span></p>
          <p className="mt-1 text-sm text-muted">{setting.description}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-navy-800">
          <span>{form.enabled ? 'On' : 'Off'}</span>
          <input type="checkbox" role="switch" aria-checked={form.enabled} aria-label={`Enable ${setting.label}`} checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-navy-900/15 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-emerald-600 checked:before:translate-x-[18px]" />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <NumberField label="Requests per day (all users)" value={form.dailyRequestLimit} onChange={(v) => setForm((f) => ({ ...f, dailyRequestLimit: v }))} />
        <NumberField label="Requests per user per day" value={form.perUserDailyLimit} onChange={(v) => setForm((f) => ({ ...f, perUserDailyLimit: v }))} />
        <NumberField label="Monthly budget (USD)" step="0.01" value={form.monthlyBudgetUsd} onChange={(v) => setForm((f) => ({ ...f, monthlyBudgetUsd: v }))} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>
          {usage ? `${usage.requests} requests · ${usd(usage.costUsd)} in 30 days · ${Math.round(budgetUsed * 100)}% of this month's budget` : '—'}
          {blocked > 0 && ` · ${blocked} blocked by limits`}{failed > 0 && ` · ${failed} failed`}
        </span>
        <Button type="button" size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(form)}>Save</Button>
      </div>
    </li>
  );
}

function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-navy-700">{label}</span>
      <Input type="number" min={0} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(step === '1' ? parseInt(e.target.value || '0', 10) : parseFloat(e.target.value || '0'))} />
    </label>
  );
}

export default function AiSettingsPage() {
  return <RequireRole roles={['ADMIN']}><SettingsContent /></RequireRole>;
}
