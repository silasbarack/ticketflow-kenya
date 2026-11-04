'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Flag, LifeBuoy, MessagesSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import FilterTabs from '@/components/ui/FilterTabs';
import Skeleton from '@/components/ui/Skeleton';
import { Select, Textarea } from '@/components/ui/Input';
import { ADMIN_NAV as NAV } from '@/lib/admin-nav';
import { formatDateTime } from '@/lib/format';

interface SupportTicket {
  id: string; reference: string; conversationId: string | null; userId: string | null; contactEmail: string | null;
  subject: string; description: string; category: string; status: string; priority: string; orderId: string | null;
  resolutionNote: string | null; createdAt: string;
}
interface ConversationRow { id: string; status: string; userId: string | null; updatedAt: string; _count: { messages: number }; messages: { content: string; role: string }[] }
interface Transcript { id: string; status: string; messages: { id: string; role: string; content: string; flagged: boolean; flagReason: string | null; feedback: number | null; feedbackNote: string | null; usedAccountData: boolean; createdAt: string }[] }

function SupportContent() {
  const [view, setView] = useState<'tickets' | 'flagged' | 'negative'>('tickets');
  const stats = useQuery({ queryKey: ['support-stats'], queryFn: async () => (await api.get('/admin/support/stats')).data as { openTickets: number; helpful: number; unhelpful: number } });
  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Customer care" title="Support" description="Escalated tickets, conversations flagged by input screening, and answers customers rated unhelpful." />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MetricCard loading={!stats.data} label="Open tickets" value={stats.data?.openTickets ?? ''} icon={LifeBuoy} tone="brand" />
        <MetricCard loading={!stats.data} label="Helpful answers" value={stats.data?.helpful ?? ''} icon={ThumbsUp} tone="success" />
        <MetricCard loading={!stats.data} label="Unhelpful answers" value={stats.data?.unhelpful ?? ''} icon={ThumbsDown} tone="warning" />
      </div>
      <div className="mt-6">
        <FilterTabs value={view} onChange={setView} label="Support view" options={[{ value: 'tickets', label: 'Tickets' }, { value: 'flagged', label: 'Flagged conversations' }, { value: 'negative', label: 'Rated unhelpful' }]} />
      </div>
      <div className="mt-4">{view === 'tickets' ? <Tickets /> : <Conversations filter={view} />}</div>
    </DashboardLayout>
  );
}

function Tickets() {
  const [status, setStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | ''>('OPEN');
  const tickets = useQuery({ queryKey: ['support-tickets', status], queryFn: async () => (await api.get<SupportTicket[]>('/admin/support/tickets', { params: { status: status || undefined } })).data });
  return (
    <div className="space-y-4">
      <FilterTabs value={status} onChange={setStatus} label="Ticket status" options={[{ value: 'OPEN', label: 'Open' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'RESOLVED', label: 'Resolved' }, { value: '', label: 'All' }]} />
      {tickets.isLoading ? <Skeleton className="h-48 rounded-card" /> : !tickets.data?.length ? (
        <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="No tickets here" />
      ) : <ul className="space-y-3">{tickets.data.map((t) => <TicketCard key={t.id} ticket={t} />)}</ul>}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [note, setNote] = useState(ticket.resolutionNote ?? '');
  const save = useMutation({
    mutationFn: async () => (await api.patch(`/admin/support/tickets/${ticket.id}`, { status, resolutionNote: note || undefined })).data,
    onSuccess: () => { toast.success('Ticket updated'); qc.invalidateQueries({ queryKey: ['support-tickets'] }); qc.invalidateQueries({ queryKey: ['support-stats'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <li className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-navy-900">{ticket.subject}</p>
          <p className="mt-0.5 text-xs text-muted">{ticket.reference} · {ticket.category.toLowerCase().replace('_', ' ')} · <span className={clsx(ticket.priority === 'HIGH' && 'font-bold text-brand-700')}>{ticket.priority.toLowerCase()}</span> · {formatDateTime(ticket.createdAt)}{ticket.contactEmail ? ` · ${ticket.contactEmail}` : ''}</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs font-bold text-navy-600 hover:text-navy-900">{open ? 'Hide' : 'Open'}</button>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
          <p className="whitespace-pre-line text-navy-800">{ticket.description}</p>
          {ticket.orderId && <p className="text-xs text-muted">Linked order: {ticket.orderId} (verified as the customer&apos;s own)</p>}
          {ticket.conversationId && <TranscriptView id={ticket.conversationId} />}
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
            </Select>
            <Textarea rows={2} value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note (required to resolve)" aria-label="Resolution note" />
          </div>
          <Button type="button" size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        </div>
      )}
    </li>
  );
}

function Conversations({ filter }: { filter: 'flagged' | 'negative' }) {
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['support-conversations', filter],
    queryFn: async () => (await api.get<ConversationRow[]>('/admin/support/conversations', { params: { [filter]: 'true' } })).data,
  });
  if (list.isLoading) return <Skeleton className="h-48 rounded-card" />;
  if (!list.data?.length) return <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Nothing to review" />;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <ul className="divide-y divide-line rounded-card border border-line bg-white shadow-soft">
        {list.data.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSelected(c.id)} className={clsx('w-full px-4 py-3 text-left text-sm', selected === c.id && 'bg-navy-900/[0.04]')}>
              <p className="truncate font-semibold text-navy-900">{c.messages[0]?.content ?? '—'}</p>
              <p className="mt-0.5 text-xs text-muted">{c._count.messages} messages · {c.userId ? 'signed in' : 'visitor'} · {formatDateTime(c.updatedAt)}</p>
            </button>
          </li>
        ))}
      </ul>
      <div>{selected ? <TranscriptView id={selected} reply /> : <EmptyState title="Select a conversation" />}</div>
    </div>
  );
}

function TranscriptView({ id, reply = false }: { id: string; reply?: boolean }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const t = useQuery({ queryKey: ['support-transcript', id], queryFn: async () => (await api.get<Transcript>(`/admin/support/conversations/${id}`)).data });
  const send = useMutation({
    mutationFn: async () => (await api.post(`/admin/support/conversations/${id}/reply`, { content: text })).data,
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['support-transcript', id] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  if (t.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  return (
    <div className="space-y-2 rounded-xl border border-line bg-navy-900/[0.02] p-3">
      {t.data?.messages.map((m) => (
        <div key={m.id} className={clsx('rounded-xl px-3 py-2 text-sm', m.role === 'USER' ? 'bg-white' : m.role === 'AGENT' ? 'bg-emerald-50' : 'bg-violet-50/60')}>
          <p className="text-[11px] font-extrabold text-navy-500">
            {m.role === 'ASSISTANT' ? 'AI assistant' : m.role === 'AGENT' ? 'Agent' : 'Customer'} · {formatDateTime(m.createdAt)}
            {m.flagged && <span className="ml-2 inline-flex items-center gap-1 text-brand-700"><Flag className="h-3 w-3" aria-hidden="true" />{m.flagReason}</span>}
            {m.feedback === -1 && <span className="ml-2 text-amber-700">rated unhelpful{m.feedbackNote ? `: ${m.feedbackNote}` : ''}</span>}
            {m.usedAccountData && <span className="ml-2 text-navy-400">used own-order data</span>}
          </p>
          <p className="mt-1 whitespace-pre-line text-navy-800">{m.content}</p>
        </div>
      ))}
      {reply && (
        <div className="flex gap-2 pt-1">
          <Textarea rows={2} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} placeholder="Reply as the TicketFlow team" aria-label="Agent reply" />
          <Button type="button" size="sm" disabled={!text.trim()} loading={send.isPending} onClick={() => send.mutate()}>Send</Button>
        </div>
      )}
    </div>
  );
}

export default function AdminSupportPage() {
  return <RequireRole roles={['ADMIN']}><SupportContent /></RequireRole>;
}
