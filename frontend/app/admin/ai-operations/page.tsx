'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Activity, AlertOctagon, AlertTriangle, Bot, CheckCircle2, Info, Play, RotateCcw, Sparkles } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import FilterTabs from '@/components/ui/FilterTabs';
import Skeleton from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Input';
import { ADMIN_NAV as NAV } from '@/lib/admin-nav';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { aiErrorMessage, useAiAvailability } from '@/lib/ai';
import { AiBadge, AiGenerating, AiReviewNotice } from '@/components/ai/AiBits';

interface Alert {
  id: string; kind: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; category: string; title: string;
  entityType: string | null; entityId: string | null; details: Record<string, unknown>; status: string;
  occurrences: number; lastSeenAt: string; createdAt: string; aiSummary: string | null; decisionNote: string | null; decidedAt: string | null;
}
interface Job { id: string; type: string; status: string; attempts: number; maxAttempts: number; lastError: string | null; runAt: string; updatedAt: string }
interface ActivityItem { id: string; at: string; source: 'JOB' | 'ALERT' | 'AI' | 'AUDIT'; title: string; status: string; detail?: string }
interface OpsMetrics {
  sales: { paidOrders: number; grossSalesKes: number; commissionKes: number; ticketsIssued: number };
  previousPeriod: { paidOrders: number; grossSalesKes: number; commissionKes: number; ticketsIssued: number };
  payments: Record<string, number>;
  verification: { pending: number; overdue48h: number };
  support: { open: number };
  eventsAwaitingApproval: number;
  topEvents: { title: string; paidOrders: number; grossSalesKes: number }[];
}
interface OpsReport { report: { headline: string; summary: string; highlights: string[]; risks: string[]; recommendedActions: { action: string; why: string; owner: string }[] } }

type Tab = 'alerts' | 'activity' | 'jobs';
const SEVERITY = {
  CRITICAL: { icon: AlertOctagon, cls: 'bg-brand-50 text-brand-800 ring-brand-200', label: 'Critical' },
  WARNING: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-900 ring-amber-200', label: 'Warning' },
  INFO: { icon: Info, cls: 'bg-sky-50 text-sky-900 ring-sky-200', label: 'Info' },
} as const;

function delta(now: number, before: number) {
  if (!before) return now ? 'new this period' : 'no change';
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs previous period`;
}

function OpsContent() {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [tab, setTab] = useState<Tab>('alerts');
  const availability = useAiAvailability();

  const metrics = useQuery({
    queryKey: ['ops-metrics', period],
    queryFn: async () => (await api.get<OpsMetrics>('/ai/copilot/metrics', { params: { period } })).data,
  });
  const report = useMutation({
    mutationFn: async () => (await api.post<OpsReport>('/ai/copilot/report', { period })).data,
    onError: (e) => toast.error(aiErrorMessage(e)),
  });

  const m = metrics.data;
  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Platform operations" title="AI Operations" description="Daily and weekly summaries, alerts for human review and everything the automation engine has done. Read-only by default: decisions are yours." />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs value={period} onChange={(v) => { setPeriod(v); report.reset(); }} label="Report period" options={[{ value: 'daily', label: 'Last 24 hours' }, { value: 'weekly', label: 'Last 7 days' }]} />
      </div>

      {metrics.isError ? <div className="mt-5"><ErrorState onRetry={() => metrics.refetch()} /></div> : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard loading={!m} label="Gross sales" value={m ? formatCurrency(m.sales.grossSalesKes) : ''} icon={Activity} tone="brand" hint={m ? delta(m.sales.grossSalesKes, m.previousPeriod.grossSalesKes) : undefined} />
          <MetricCard loading={!m} label="Commission" value={m ? formatCurrency(m.sales.commissionKes) : ''} icon={Activity} tone="success" hint={m ? `${m.sales.paidOrders} paid orders · ${m.sales.ticketsIssued} tickets` : undefined} />
          <MetricCard loading={!m} label="Verifications pending" value={m?.verification.pending ?? ''} icon={CheckCircle2} tone="warning" hint={m ? `${m.verification.overdue48h} waiting over 48h · ${m.eventsAwaitingApproval} events awaiting approval` : undefined} />
          <MetricCard loading={!m} label="Open support tickets" value={m?.support.open ?? ''} icon={Info} hint={m ? `Payments: ${m.payments.SUCCESS ?? 0} ok · ${m.payments.FAILED ?? 0} failed · ${m.payments.PENDING ?? 0} pending` : undefined} />
        </div>
      )}

      <section className="mt-6 rounded-card border border-violet-200 bg-gradient-to-br from-white to-violet-50/60 p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title flex items-center gap-2"><Bot className="h-4 w-4 text-violet-700" aria-hidden="true" />{period === 'daily' ? 'Daily summary' : 'Weekly operating report'}</h2>
          {availability.data?.ADMIN_COPILOT && !report.isPending && (
            <Button type="button" size="sm" onClick={() => report.mutate()} className="bg-violet-700 shadow-none hover:bg-violet-800"><Sparkles className="h-4 w-4" aria-hidden="true" />{report.data ? 'Regenerate' : 'Generate report'}</Button>
          )}
        </div>
        {!availability.data?.ADMIN_COPILOT ? (
          <p className="mt-3 text-sm text-muted">The copilot is unavailable — it is switched off in AI Settings or the AI provider is not configured on the server. The metrics above are always live.</p>
        ) : report.isPending ? <div className="mt-4"><AiGenerating label="Writing the report…" /></div> : report.data ? (
          <div className="mt-4 space-y-4 text-sm">
            <AiBadge />
            <AiReviewNotice>Generated from the metrics above. Recommended actions are suggestions — carry them out through the normal admin pages.</AiReviewNotice>
            <p className="text-base font-extrabold text-navy-900">{report.data.report.headline}</p>
            <p className="leading-relaxed text-navy-800">{report.data.report.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <ListBlock title="Highlights" items={report.data.report.highlights} />
              <ListBlock title="Risks" items={report.data.report.risks} />
            </div>
            {report.data.report.recommendedActions.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-navy-400">Recommended actions</p>
                <ul className="mt-2 space-y-2">
                  {report.data.report.recommendedActions.map((a) => (
                    <li key={a.action} className="rounded-xl border border-line bg-white p-3"><span className="mr-2 rounded-full bg-navy-900/5 px-2 py-0.5 text-xs font-extrabold text-navy-600">{a.owner}</span><strong>{a.action}</strong><p className="mt-1 text-navy-600">{a.why}</p></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : <p className="mt-3 text-sm text-muted">Generate a plain-language summary with suggested priorities.</p>}
        {m && m.topEvents.length > 0 && (
          <p className="mt-4 border-t border-violet-100 pt-3 text-xs text-muted">Top events: {m.topEvents.map((e) => `${e.title} (${formatCurrency(e.grossSalesKes)})`).join(' · ')}</p>
        )}
      </section>

      <div className="mt-8">
        <FilterTabs value={tab} onChange={setTab} label="Operations view" options={[{ value: 'alerts', label: 'Alerts & review' }, { value: 'activity', label: 'Automation activity' }, { value: 'jobs', label: 'Background jobs' }]} />
        <div className="mt-4">
          {tab === 'alerts' && <AlertsPanel aiAvailable={Boolean(availability.data?.ANOMALY_EXPLAINER)} />}
          {tab === 'activity' && <ActivityPanel />}
          {tab === 'jobs' && <JobsPanel />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-navy-400">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-navy-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

function AlertsPanel({ aiAvailable }: { aiAvailable: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'ACTIVE' | 'RESOLVED' | 'DISMISSED'>('ACTIVE');
  const [category, setCategory] = useState<'' | 'PAYMENT' | 'RISK' | 'VERIFICATION' | 'SUPPORT'>('');
  const alerts = useQuery({
    queryKey: ['ops-alerts', status, category],
    queryFn: async () => (await api.get<Alert[]>('/admin/automation/alerts', { params: { status, category: category || undefined } })).data,
  });
  const run = useMutation({
    mutationFn: async (name: string) => (await api.post(`/admin/automation/monitors/${name}/run`)).data,
    onSuccess: () => { toast.success('Check complete'); qc.invalidateQueries({ queryKey: ['ops-alerts'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <FilterTabs value={status} onChange={setStatus} label="Alert status" options={[{ value: 'ACTIVE', label: 'Needs review' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }]} />
          <FilterTabs value={category} onChange={setCategory} label="Alert category" options={[{ value: '', label: 'All' }, { value: 'PAYMENT', label: 'Payments' }, { value: 'RISK', label: 'Fraud & risk' }, { value: 'VERIFICATION', label: 'Verification' }, { value: 'SUPPORT', label: 'Support' }]} />
        </div>
        <div className="flex flex-wrap gap-2">
          {['payments', 'risk', 'verification'].map((n) => (
            <Button key={n} type="button" size="sm" variant="outline" loading={run.isPending && run.variables === n} onClick={() => run.mutate(n)}><Play className="h-3.5 w-3.5" aria-hidden="true" />Run {n} check</Button>
          ))}
        </div>
      </div>
      {alerts.isLoading ? <Skeleton className="h-48 rounded-card" /> : alerts.isError ? <ErrorState onRetry={() => alerts.refetch()} /> : !alerts.data?.length ? (
        <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Nothing to review" description="Rules-based monitors run every few minutes. New anomalies appear here for a human decision." />
      ) : (
        <ul className="space-y-3">{alerts.data.map((a) => <AlertCard key={a.id} alert={a} aiAvailable={aiAvailable} />)}</ul>
      )}
    </div>
  );
}

function AlertCard({ alert, aiAvailable }: { alert: Alert; aiAvailable: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[alert.severity];
  const closed = alert.status === 'RESOLVED' || alert.status === 'DISMISSED';

  const decide = useMutation({
    mutationFn: async (decision: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED') => (await api.post(`/admin/automation/alerts/${alert.id}/decision`, { decision, note })).data,
    onSuccess: () => { toast.success('Decision recorded'); setNote(''); qc.invalidateQueries({ queryKey: ['ops-alerts'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const explain = useMutation({
    mutationFn: async () => (await api.post(`/admin/automation/alerts/${alert.id}/explain`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops-alerts'] }),
    onError: (e) => toast.error(aiErrorMessage(e)),
  });

  return (
    <li className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1', sev.cls)}><sev.icon className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-bold text-navy-900">{alert.title}</p>
            <p className="mt-0.5 text-xs text-muted">{sev.label} · {alert.category.toLowerCase()} · {alert.kind} · {alert.status.toLowerCase()}{alert.occurrences > 1 ? ` · seen ${alert.occurrences}×` : ''} · {formatDateTime(alert.lastSeenAt)}</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs font-bold text-navy-600 hover:text-navy-900">{open ? 'Hide' : 'Review'}</button>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
          <pre className="overflow-x-auto rounded-xl bg-navy-900/[0.04] p-3 text-xs text-navy-800">{JSON.stringify({ entity: `${alert.entityType ?? ''} ${alert.entityId ?? ''}`.trim(), ...alert.details }, null, 2)}</pre>
          {alert.aiSummary ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3"><AiBadge className="mb-2" /><p className="whitespace-pre-line text-navy-800">{alert.aiSummary}</p></div>
          ) : aiAvailable ? (
            <Button type="button" size="sm" variant="outline" loading={explain.isPending} onClick={() => explain.mutate()}><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Explain with AI</Button>
          ) : null}
          {closed ? (
            <p className="text-xs text-muted">Decision ({alert.status.toLowerCase()} {alert.decidedAt ? formatDateTime(alert.decidedAt) : ''}): {alert.decisionNote}</p>
          ) : (
            <div className="space-y-2">
              <Textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Decision note (required): what you checked and what you decided" aria-label="Decision note" />
              <p className="text-xs text-muted">Recording a decision does not change any payment, ticket or account. Take those actions through the relevant admin page.</p>
              <div className="flex flex-wrap gap-2">
                {alert.status === 'OPEN' && <Button type="button" size="sm" variant="outline" disabled={note.trim().length < 3} loading={decide.isPending && decide.variables === 'ACKNOWLEDGED'} onClick={() => decide.mutate('ACKNOWLEDGED')}>Acknowledge</Button>}
                <Button type="button" size="sm" disabled={note.trim().length < 3} loading={decide.isPending && decide.variables === 'RESOLVED'} onClick={() => decide.mutate('RESOLVED')}>Resolve</Button>
                <Button type="button" size="sm" variant="ghost" disabled={note.trim().length < 3} loading={decide.isPending && decide.variables === 'DISMISSED'} onClick={() => decide.mutate('DISMISSED')}>Dismiss as false positive</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ActivityPanel() {
  const feed = useQuery({
    queryKey: ['ops-activity'],
    refetchInterval: 30_000,
    queryFn: async () => (await api.get<ActivityItem[]>('/admin/automation/activity')).data,
  });
  if (feed.isLoading) return <Skeleton className="h-64 rounded-card" />;
  if (feed.isError) return <ErrorState onRetry={() => feed.refetch()} />;
  if (!feed.data?.length) return <EmptyState icon={<Activity className="h-6 w-6" />} title="No automation activity yet" />;
  const tone = { JOB: 'bg-navy-900/5 text-navy-700', ALERT: 'bg-amber-50 text-amber-900', AI: 'bg-violet-50 text-violet-800', AUDIT: 'bg-emerald-50 text-emerald-800' };
  return (
    <ol className="divide-y divide-line rounded-card border border-line bg-white shadow-soft">
      {feed.data.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-extrabold', tone[i.source])}>{i.source}</span>
          <span className="font-semibold capitalize text-navy-900">{i.title}</span>
          <span className="text-xs text-muted">{i.status}</span>
          {i.detail && <span className="w-full truncate text-xs text-muted sm:w-auto">{i.detail}</span>}
          <span className="ml-auto text-xs text-muted">{formatDateTime(i.at)}</span>
        </li>
      ))}
    </ol>
  );
}

function JobsPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'DEAD' | 'QUEUED' | 'SUCCEEDED' | ''>('DEAD');
  const jobs = useQuery({
    queryKey: ['ops-jobs', status],
    queryFn: async () => (await api.get<Job[]>('/admin/automation/jobs', { params: { status: status || undefined } })).data,
  });
  const retry = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/automation/jobs/${id}/retry`)).data,
    onSuccess: () => { toast.success('Job re-queued'); qc.invalidateQueries({ queryKey: ['ops-jobs'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <FilterTabs value={status} onChange={setStatus} label="Job status" options={[{ value: 'DEAD', label: 'Dead letter' }, { value: 'QUEUED', label: 'Queued' }, { value: 'SUCCEEDED', label: 'Succeeded' }, { value: '', label: 'All' }]} />
      {jobs.isLoading ? <Skeleton className="h-48 rounded-card" /> : !jobs.data?.length ? (
        <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={status === 'DEAD' ? 'No failed jobs' : 'No jobs'} description="Ticket emails, reminders and notices run here with automatic retries." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Attempts</th><th className="px-4 py-3 font-semibold">Last error</th><th className="px-4 py-3 font-semibold">Updated</th><th className="px-4 py-3" /></tr></thead>
            <tbody>
              {jobs.data.map((j) => (
                <tr key={j.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold text-navy-900">{j.type}</td>
                  <td className="px-4 py-3">{j.status}</td>
                  <td className="tnum px-4 py-3">{j.attempts}/{j.maxAttempts}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-xs text-muted" title={j.lastError ?? ''}>{j.lastError ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDateTime(j.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">{['DEAD', 'CANCELLED'].includes(j.status) && <Button type="button" size="sm" variant="outline" loading={retry.isPending && retry.variables === j.id} onClick={() => retry.mutate(j.id)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Retry</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AiOperationsPage() {
  return <RequireRole roles={['ADMIN']}><OpsContent /></RequireRole>;
}
