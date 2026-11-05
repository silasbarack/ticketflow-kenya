'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { AlertTriangle, BarChart3, ScanLine, Sparkles, Ticket, TrendingUp, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { ORGANIZER_NAV as NAV } from '@/lib/organizer-nav';
import { formatCurrency, formatDate } from '@/lib/format';
import { aiErrorMessage, useAiAvailability } from '@/lib/ai';
import { AiBadge, AiGenerating, AiReviewNotice, Percent } from '@/components/ai/AiBits';

interface OverviewRow {
  id: string;
  title: string;
  status: string;
  startDateTime: string;
  ticketsSold: number;
  capacity: number;
  sellThrough: number;
  grossSalesKes: number;
  organizerEarningsKes: number;
  lowSales: boolean;
}

interface Range { low: number; expected: number; high: number }

interface EventMetrics {
  event: { id: string; title: string; status: string; startDateTime: string };
  totals: {
    ticketsSold: number; capacity: number; sellThrough: number; paidOrders: number;
    grossSalesKes: number; organizerEarningsKes: number; platformFeesKes: number;
    refundedTickets: number; cancelledTickets: number; checkIns: number; checkInRate: number | null;
  };
  funnel: { note: string; ordersCreated: number; paymentAttempts: number; ordersPaid: number; ordersFailed: number; ordersPending: number; orderToPaidRate: number | null };
  tiers: { id: string; name: string; category: string; priceKes: number; capacity: number; sold: number; sellThrough: number; grossKes: number }[];
  daily: { day: string; tickets: number; grossKes: number }[];
  forecast: { available: boolean; reason?: string; method?: string; daysOfHistory: number; daysRemaining: number; projectedTotalTickets?: Range; confidence?: 'low' | 'medium' | 'high' };
  attendanceForecast: { available: boolean; reason?: string; expectedRate?: number; range?: { low: number; high: number }; expectedAttendees?: number; basedOnEvents?: number; note?: string };
  alerts: { kind: string; message: string }[];
}

interface Narrative {
  narrative: { summary: string; trends: string[]; recommendations: { title: string; detail: string }[]; caveats: string[] };
}

function InsightsContent() {
  const availability = useAiAvailability();
  const overview = useQuery({
    queryKey: ['insights-overview'],
    queryFn: async () => (await api.get<OverviewRow[]>('/ai/insights/overview')).data,
  });
  const [eventId, setEventId] = useState('');
  useEffect(() => {
    if (!eventId && overview.data?.length) setEventId(overview.data[0].id);
  }, [eventId, overview.data]);

  const metrics = useQuery({
    queryKey: ['insights-event', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => (await api.get<EventMetrics>(`/ai/insights/events/${eventId}`)).data,
  });

  const explain = useMutation({
    mutationFn: async () => (await api.post<Narrative>(`/ai/insights/events/${eventId}/explain`)).data,
    onError: (error) => toast.error(aiErrorMessage(error)),
  });
  useEffect(() => explain.reset(), [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const lowSales = (overview.data ?? []).filter((e) => e.lowSales);
  const m = metrics.data;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Organizer tools" title="Sales Insights" description="Every figure is calculated from confirmed payments, issued tickets and check-ins. AI only explains the numbers." />

      {lowSales.length > 0 && (
        <div role="status" className="mt-6 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-extrabold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Low sales</p>
          <ul className="mt-1 list-disc pl-6">
            {lowSales.map((e) => <li key={e.id}>{e.title}: {Math.round(e.sellThrough * 100)}% sold, starts {formatDate(e.startDateTime)}</li>)}
          </ul>
        </div>
      )}

      {overview.isLoading ? (
        <Skeleton className="mt-7 h-80 rounded-card" />
      ) : overview.isError ? (
        <div className="mt-7"><ErrorState onRetry={() => overview.refetch()} /></div>
      ) : !overview.data?.length ? (
        <div className="mt-7"><EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No events yet" description="Create an event to see its sales here." /></div>
      ) : (
        <>
          <label className="mt-7 block max-w-md">
            <span className="mb-1.5 block text-sm font-medium text-navy-800">Event</span>
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {overview.data.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatDate(e.startDateTime)}</option>)}
            </Select>
          </label>

          {metrics.isLoading || !m ? (
            <Skeleton className="mt-6 h-96 rounded-card" />
          ) : (
            <div className="mt-6 space-y-6">
              {m.alerts.map((a) => <p key={a.kind} className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{a.message}</p>)}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Tickets sold" value={`${m.totals.ticketsSold} / ${m.totals.capacity}`} icon={Ticket} tone="brand" hint={`${Math.round(m.totals.sellThrough * 100)}% of capacity`} />
                <MetricCard label="Gross sales" value={formatCurrency(m.totals.grossSalesKes)} icon={Wallet} hint="Paid orders incl. service fee" />
                <MetricCard label="Your earnings" value={formatCurrency(m.totals.organizerEarningsKes)} icon={Wallet} tone="success" hint={`Service fees ${formatCurrency(m.totals.platformFeesKes)}`} />
                <MetricCard label="Check-ins" value={m.totals.checkIns} icon={ScanLine} tone="neutral" hint={m.totals.checkInRate === null ? 'No tickets yet' : `${Math.round(m.totals.checkInRate * 100)}% of tickets`} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section className="rounded-card border border-line bg-white p-5 shadow-soft">
                  <h2 className="section-title">Tickets sold per day</h2>
                  <p className="mt-1 text-xs text-muted">Last 60 days, by payment confirmation date.</p>
                  <DailyBars daily={m.daily} />
                </section>

                <section className="space-y-4 rounded-card border border-line bg-white p-5 shadow-soft">
                  <h2 className="section-title flex items-center gap-2"><TrendingUp className="h-4 w-4 text-navy-400" aria-hidden="true" />Forecast</h2>
                  {m.forecast.available && m.forecast.projectedTotalTickets ? (
                    <div>
                      <p className="tnum text-3xl font-extrabold tracking-tight text-navy-900">~{m.forecast.projectedTotalTickets.expected} <span className="text-base font-bold text-muted">tickets by event day</span></p>
                      <p className="mt-1 text-sm text-navy-700">Likely range {m.forecast.projectedTotalTickets.low}–{m.forecast.projectedTotalTickets.high} · confidence <strong>{m.forecast.confidence}</strong></p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{m.forecast.method}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No sales forecast yet: {m.forecast.reason}</p>
                  )}
                  <div className="border-t border-line pt-4">
                    <p className="text-sm font-bold text-navy-900">Expected turnout</p>
                    {m.attendanceForecast.available ? (
                      <p className="mt-1 text-sm text-navy-700">
                        ~{m.attendanceForecast.expectedAttendees} attendees (<Percent value={m.attendanceForecast.expectedRate} />, range <Percent value={m.attendanceForecast.range?.low} />–<Percent value={m.attendanceForecast.range?.high} />), based on {m.attendanceForecast.basedOnEvents} past events.
                      </p>
                    ) : <p className="mt-1 text-sm text-muted">{m.attendanceForecast.reason}</p>}
                  </div>
                  <div className="border-t border-line pt-4 text-sm">
                    <p className="font-bold text-navy-900">Checkout funnel</p>
                    <p className="mt-1 text-navy-700">{m.funnel.ordersCreated} orders started → {m.funnel.ordersPaid} paid (<Percent value={m.funnel.orderToPaidRate} />) · {m.funnel.ordersFailed} failed · {m.funnel.ordersPending} pending</p>
                    <p className="mt-1 text-xs text-muted">{m.funnel.note}</p>
                  </div>
                </section>
              </div>

              <section className="rounded-card border border-line bg-white p-5 shadow-soft">
                <h2 className="section-title">Ticket tiers</h2>
                <ul className="mt-4 space-y-4">
                  {m.tiers.map((t) => (
                    <li key={t.id}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-bold text-navy-900">{t.name} <span className="font-semibold text-muted">· {formatCurrency(t.priceKes)}</span></span>
                        <span className="tnum text-navy-700">{t.sold} / {t.capacity} sold · {formatCurrency(t.grossKes)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]" role="img" aria-label={`${t.name}: ${Math.round(t.sellThrough * 100)}% sold`}>
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(t.sellThrough * 100, 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-card border border-violet-200 bg-gradient-to-br from-white to-violet-50/60 p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="section-title flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />AI explanation & recommendations</h2>
                  {availability.data?.SALES_INSIGHTS && !explain.isPending && (
                    <Button type="button" size="sm" onClick={() => explain.mutate()} className="bg-violet-700 shadow-none hover:bg-violet-800">{explain.data ? 'Refresh' : 'Explain these numbers'}</Button>
                  )}
                </div>
                {!availability.data?.SALES_INSIGHTS ? (
                  <p className="mt-3 text-sm text-muted">AI explanations are not enabled. All figures above are still accurate.</p>
                ) : explain.isPending ? (
                  <div className="mt-4"><AiGenerating label="Reading your sales…" /></div>
                ) : explain.data ? (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="flex items-center gap-2"><AiBadge /></div>
                    <AiReviewNotice>AI wrote this from the figures above. It can be wrong — the figures are the source of truth.</AiReviewNotice>
                    <p className="leading-relaxed text-navy-800">{explain.data.narrative.summary}</p>
                    {explain.data.narrative.trends.length > 0 && <ul className="list-disc space-y-1 pl-5 text-navy-700">{explain.data.narrative.trends.map((t) => <li key={t}>{t}</li>)}</ul>}
                    <div className="grid gap-3 md:grid-cols-2">
                      {explain.data.narrative.recommendations.map((r) => (
                        <div key={r.title} className="rounded-xl border border-line bg-white p-3.5"><p className="font-bold text-navy-900">{r.title}</p><p className="mt-1 text-navy-700">{r.detail}</p></div>
                      ))}
                    </div>
                    {explain.data.narrative.caveats.length > 0 && <p className="text-xs text-muted">Caveats: {explain.data.narrative.caveats.join(' · ')}</p>}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">Get a plain-language read of these numbers and practical next steps.</p>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

/** Single-series bars with per-bar hover/focus tooltip and a table view. */
function DailyBars({ daily }: { daily: EventMetrics['daily'] }) {
  const [active, setActive] = useState<number | null>(null);
  const days = useMemo(() => {
    const byDay = new Map(daily.map((d) => [d.day, d]));
    const out: EventMetrics['daily'] = [];
    for (let i = 59; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push(byDay.get(day) ?? { day, tickets: 0, grossKes: 0 });
    }
    return out;
  }, [daily]);
  const max = Math.max(1, ...days.map((d) => d.tickets));
  const total = days.reduce((n, d) => n + d.tickets, 0);

  if (total === 0) return <p className="mt-6 rounded-xl bg-navy-900/[0.03] px-4 py-10 text-center text-sm text-muted">No confirmed sales in the last 60 days.</p>;

  const point = active !== null ? days[active] : null;
  return (
    <div className="mt-4">
      <div className="h-6 text-xs text-navy-700" aria-live="polite">
        {point ? <span><strong className="tnum">{point.tickets}</strong> tickets · {formatCurrency(point.grossKes)} · {formatDate(point.day)}</span> : <span className="text-muted">Peak {max} tickets/day · hover a bar for details</span>}
      </div>
      <div className="relative mt-2 flex h-40 items-end gap-[2px] border-b border-line" onMouseLeave={() => setActive(null)}>
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            aria-label={`${formatDate(d.day)}: ${d.tickets} tickets`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group flex h-full min-w-0 flex-1 items-end focus:outline-none"
          >
            <span
              className={clsx('block w-full rounded-t-[4px] transition-colors', d.tickets ? (active === i ? 'bg-brand-800' : 'bg-brand-600') : 'bg-transparent', 'group-focus-visible:ring-2 group-focus-visible:ring-brand-300')}
              style={{ height: d.tickets ? `${Math.max((d.tickets / max) * 100, 3)}%` : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{formatDate(days[0].day)}</span>
        <span>Today</span>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-semibold text-navy-600">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr className="text-muted"><th className="py-1 font-semibold">Day</th><th className="py-1 font-semibold">Tickets</th><th className="py-1 font-semibold">Gross</th></tr></thead>
          <tbody>{days.filter((d) => d.tickets).map((d) => <tr key={d.day} className="border-t border-line"><td className="py-1">{formatDate(d.day)}</td><td className="tnum py-1">{d.tickets}</td><td className="tnum py-1">{formatCurrency(d.grossKes)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

export default function InsightsPage() {
  return <RequireRole roles={['ORGANIZER']}><InsightsContent /></RequireRole>;
}
