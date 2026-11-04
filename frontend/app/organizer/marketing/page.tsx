'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Check, Megaphone, PencilLine, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ORGANIZER_NAV as NAV } from '@/lib/organizer-nav';
import { aiErrorMessage, MARKETING_CHANNELS, MarketingChannel, MarketingDraft, useAiAvailability } from '@/lib/ai';
import { AiBadge, AiGenerating, AiReviewNotice, AiUnavailable, AiWarnings, CopyButton } from '@/components/ai/AiBits';
import { EventItem } from '@/types';
import { formatDate } from '@/lib/format';

type Piece = MarketingDraft['output']['pieces'][number];

function MarketingStudioContent() {
  const queryClient = useQueryClient();
  const availability = useAiAvailability();
  const [eventId, setEventId] = useState('');
  const [channels, setChannels] = useState<MarketingChannel[]>(['INSTAGRAM', 'WHATSAPP']);
  const [languages, setLanguages] = useState<('en' | 'sw')[]>(['en', 'sw']);
  const [tone, setTone] = useState('friendly and energetic');
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<MarketingDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');

  const events = useQuery({
    queryKey: ['organizer-events'],
    queryFn: async () => (await api.get<EventItem[]>('/events/organizer/mine')).data,
  });

  const history = useQuery({
    queryKey: ['ai-drafts', 'MARKETING_STUDIO', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => (await api.get<MarketingDraft[]>('/ai/drafts', { params: { feature: 'MARKETING_STUDIO', eventId } })).data,
  });

  const selectableEvents = useMemo(() => (events.data ?? []).filter((e) => !['CANCELLED', 'COMPLETED'].includes(e.status)), [events.data]);

  const generate = useMutation({
    mutationFn: async () => (await api.post<MarketingDraft>('/ai/marketing/drafts', { eventId, channels, languages, tone, notes: notes || undefined })).data,
    onSuccess: (data) => {
      setDraft(data);
      setEditingIndex(null);
      queryClient.invalidateQueries({ queryKey: ['ai-drafts', 'MARKETING_STUDIO', eventId] });
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  const saveEdit = useMutation({
    mutationFn: async (index: number) => {
      if (!draft) throw new Error('No draft');
      const pieces = draft.output.pieces.map((p, i) => (i === index ? { ...p, body: editBody } : p));
      return (await api.patch<MarketingDraft>(`/ai/drafts/${draft.id}`, { output: { pieces } })).data;
    },
    onSuccess: (data) => {
      setDraft(data);
      setEditingIndex(null);
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  const decide = useMutation({
    mutationFn: async (decision: 'accept' | 'discard') => {
      if (!draft) throw new Error('No draft');
      return (await api.post<MarketingDraft>(`/ai/drafts/${draft.id}/${decision}`)).data;
    },
    onSuccess: (data) => {
      toast.success(data.status === 'ACCEPTED' ? 'Marked as approved. Copy each piece into your channels.' : 'Draft discarded');
      setDraft(data.status === 'ACCEPTED' ? data : null);
      queryClient.invalidateQueries({ queryKey: ['ai-drafts', 'MARKETING_STUDIO', eventId] });
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const canGenerate = eventId && channels.length > 0 && languages.length > 0;
  const enabled = availability.data?.MARKETING_STUDIO;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader
        eyebrow="Organizer tools"
        title="AI Marketing Studio"
        description="Draft social posts, WhatsApp messages and emails from your real event details, in English and Kiswahili. You review, edit and post them yourself."
        actions={<AiBadge label="AI-powered" />}
      />

      {availability.isLoading ? (
        <Skeleton className="mt-7 h-64 rounded-card" />
      ) : !enabled ? (
        <div className="mt-7"><AiUnavailable title="Marketing Studio is not enabled" /></div>
      ) : (
        <div className="mt-7 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-5 rounded-card border border-line bg-white p-5 shadow-soft xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy-800">Event</span>
              {events.isLoading ? <Skeleton className="h-12" /> : (
                <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setDraft(null); }}>
                  <option value="">Choose an event</option>
                  {selectableEvents.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatDate(e.startDateTime)}</option>)}
                </Select>
              )}
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-navy-800">Channels</legend>
              <div className="flex flex-wrap gap-2">
                {MARKETING_CHANNELS.map((c) => (
                  <button key={c.value} type="button" aria-pressed={channels.includes(c.value)} onClick={() => setChannels((l) => toggle(l, c.value))}
                    className={clsx('filter-chip', channels.includes(c.value) && 'border-violet-700 bg-violet-700 text-white')}>{c.label}</button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-navy-800">Languages</legend>
              <div className="flex gap-2">
                {([['en', 'English'], ['sw', 'Kiswahili']] as const).map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={languages.includes(v)} onClick={() => setLanguages((x) => toggle(x, v))}
                    className={clsx('filter-chip', languages.includes(v) && 'border-violet-700 bg-violet-700 text-white')}>{l}</button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy-800">Tone</span>
              <Input value={tone} maxLength={40} onChange={(e) => setTone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy-800">Anything to emphasise? (optional)</span>
              <Textarea rows={3} maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. parking is available; family friendly" />
              <span className="mt-1 block text-[11px] text-muted">Don&apos;t add performers, sponsors or offers unless they are confirmed.</span>
            </label>

            <Button type="button" fullWidth disabled={!canGenerate} loading={generate.isPending} onClick={() => generate.mutate()} className="bg-violet-700 shadow-none hover:bg-violet-800">
              <Sparkles className="h-4 w-4" aria-hidden="true" />{draft ? 'Generate new set' : 'Generate drafts'}
            </Button>
          </aside>

          <section className="min-w-0 space-y-4" aria-live="polite">
            {generate.isPending ? (
              <AiGenerating label="Writing your campaign drafts…" />
            ) : !draft ? (
              <EmptyState
                icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
                title={eventId ? 'Ready when you are' : 'Choose an event to start'}
                description="Drafts use your event's real title, date, venue and ticket prices from TicketFlow."
              />
            ) : (
              <>
                <AiReviewNotice>
                  These are drafts. {draft.output.delivery.note}
                </AiReviewNotice>
                <AiWarnings warnings={draft.output.warnings} />

                <div className="grid gap-4 lg:grid-cols-2">
                  {draft.output.pieces.map((piece, index) => (
                    <PieceCard key={`${piece.channel}-${piece.language}-${index}`} piece={piece}
                      editing={editingIndex === index} editBody={editBody} setEditBody={setEditBody}
                      readOnly={draft.status !== 'DRAFT'}
                      onEdit={() => { setEditingIndex(index); setEditBody(piece.body); }}
                      onCancel={() => setEditingIndex(null)}
                      onSave={() => saveEdit.mutate(index)} saving={saveEdit.isPending} />
                  ))}
                </div>

                {draft.output.campaignIdeas.length > 0 && (
                  <div className="rounded-card border border-line bg-white p-5 shadow-soft">
                    <h2 className="section-title">Campaign ideas</h2>
                    <ul className="mt-3 space-y-3">
                      {draft.output.campaignIdeas.map((idea) => (
                        <li key={idea.title} className="rounded-xl bg-navy-900/[0.03] p-3.5">
                          <p className="text-sm font-bold text-navy-900">{idea.title} <span className="ml-1 text-xs font-semibold text-muted">· {idea.timing}</span></p>
                          <p className="mt-1 text-sm leading-relaxed text-navy-700">{idea.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {draft.status === 'DRAFT' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" loading={decide.isPending && decide.variables === 'accept'} onClick={() => decide.mutate('accept')}><Check className="h-4 w-4" aria-hidden="true" />Approve drafts</Button>
                    <Button type="button" variant="outline" loading={generate.isPending} onClick={() => generate.mutate()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Regenerate</Button>
                    <Button type="button" variant="ghost" loading={decide.isPending && decide.variables === 'discard'} onClick={() => decide.mutate('discard')}><Trash2 className="h-4 w-4" aria-hidden="true" />Discard</Button>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" />Approved {draft.decidedAt ? new Date(draft.decidedAt).toLocaleDateString('en-KE') : ''} — copy each piece to post it.</p>
                )}
              </>
            )}

            {eventId && (history.data?.length ?? 0) > 0 && (
              <details className="rounded-card border border-line bg-white p-4 text-sm shadow-soft">
                <summary className="cursor-pointer font-bold text-navy-900">Previous drafts for this event ({history.data!.length})</summary>
                <ul className="mt-3 divide-y divide-line">
                  {history.data!.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-muted">{new Date(h.createdAt).toLocaleString('en-KE')} · {h.output.pieces.length} pieces</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy-600">{h.status.toLowerCase()}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(h)}>Open</Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

function PieceCard({ piece, editing, editBody, setEditBody, onEdit, onCancel, onSave, saving, readOnly }: {
  piece: Piece; editing: boolean; editBody: string; setEditBody: (v: string) => void;
  onEdit: () => void; onCancel: () => void; onSave: () => void; saving: boolean; readOnly: boolean;
}) {
  const label = MARKETING_CHANNELS.find((c) => c.value === piece.channel)?.label ?? piece.channel;
  const full = [piece.title && piece.channel === 'EMAIL' ? `Subject: ${piece.title}` : '', piece.body, piece.hashtags.join(' ')].filter(Boolean).join('\n\n');
  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-4 shadow-soft">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-extrabold text-white">{label}</span>
          <span className="text-[11px] font-bold uppercase text-muted">{piece.language === 'sw' ? 'Kiswahili' : 'English'}</span>
        </div>
        <div className="flex items-center">
          {!readOnly && !editing && (
            <button type="button" aria-label={`Edit ${label}`} onClick={onEdit} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-900/5 hover:text-navy-900"><PencilLine className="h-3.5 w-3.5" aria-hidden="true" /></button>
          )}
          <CopyButton text={full} label={label} />
        </div>
      </header>
      {piece.title && <p className="mt-3 text-sm font-extrabold text-navy-900">{piece.title}</p>}
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={7} value={editBody} maxLength={3000} onChange={(e) => setEditBody(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" size="sm" loading={saving} onClick={onSave}><Send className="h-4 w-4" aria-hidden="true" />Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-relaxed text-navy-800">{piece.body}</p>
      )}
      {piece.hashtags.length > 0 && <p className="mt-3 text-xs font-semibold text-violet-700">{piece.hashtags.join(' ')}</p>}
    </article>
  );
}

export default function MarketingStudioPage() {
  return <RequireRole roles={['ORGANIZER']}><MarketingStudioContent /></RequireRole>;
}
