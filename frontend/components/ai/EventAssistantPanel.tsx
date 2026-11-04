'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Check, PencilLine, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { aiErrorMessage, EventAssistantDraft, EventCopy, useAiAvailability } from '@/lib/ai';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { AiBadge, AiGenerating, AiReviewNotice, AiUnavailable, AiWarnings, CopyButton } from '@/components/ai/AiBits';

export interface EventAssistantInput {
  name: string;
  categoryId?: string;
  venue: string;
  city: string;
  startDateTime?: string;
  endDateTime?: string;
  basicDescription: string;
}

type Lang = 'en' | 'sw';

/**
 * Generate → review → edit → accept/discard. Accepting only fills the form's
 * description; the organiser still saves the draft event themselves, and
 * prices, dates and publishing are never touched by the assistant.
 */
export default function EventAssistantPanel({
  input,
  onAcceptDescription,
}: {
  input: EventAssistantInput;
  onAcceptDescription: (text: string) => void;
}) {
  const availability = useAiAvailability();
  const [audience, setAudience] = useState('');
  const [wantSw, setWantSw] = useState(true);
  const [draft, setDraft] = useState<EventAssistantDraft | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState({ description: '', summary: '' });

  const missing = [!input.name && 'event title', !input.venue && 'venue', !input.city && 'city', input.basicDescription.trim().length < 10 && 'a short description (10+ characters)'].filter(Boolean) as string[];

  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<EventAssistantDraft>('/ai/event-assistant/drafts', {
        name: input.name,
        categoryId: input.categoryId || undefined,
        venue: input.venue,
        city: input.city,
        startDateTime: input.startDateTime ? new Date(input.startDateTime).toISOString() : undefined,
        endDateTime: input.endDateTime ? new Date(input.endDateTime).toISOString() : undefined,
        targetAudience: audience || undefined,
        basicDescription: input.basicDescription,
        languages: wantSw ? ['en', 'sw'] : ['en'],
      });
      return data;
    },
    onSuccess: (data) => {
      setDraft(data);
      setLang('en');
      setEditing(false);
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      const current = draft.output[lang] as EventCopy;
      const { data } = await api.patch<EventAssistantDraft>(`/ai/drafts/${draft.id}`, {
        output: { [lang]: { ...current, description: editText.description, summary: editText.summary } },
      });
      return data;
    },
    onSuccess: (data) => {
      setDraft(data);
      setEditing(false);
      toast.success('Edits saved to the draft');
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  const decide = useMutation({
    mutationFn: async (decision: 'accept' | 'discard') => {
      if (!draft) throw new Error('No draft');
      await api.post(`/ai/drafts/${draft.id}/${decision}`);
      return decision;
    },
    onSuccess: (decision) => {
      if (decision === 'accept' && draft) {
        onAcceptDescription(composeDescription(draft.output[lang] as EventCopy));
        toast.success('Description added to your form. Review it, then save your draft.');
      } else {
        toast('Draft discarded');
      }
      setDraft(null);
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  });

  if (availability.isLoading) return null;
  if (!availability.data?.EVENT_ASSISTANT) {
    return <AiUnavailable title="AI Event Assistant" message="AI drafting isn&apos;t available right now. You can write your listing as usual." />;
  }

  const copy = draft ? (draft.output[lang] as EventCopy | null) : null;

  return (
    <section className="rounded-card border border-violet-200 bg-gradient-to-br from-white via-white to-violet-50/70 p-5 shadow-soft sm:p-6" aria-labelledby="ai-assistant-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-violet-100 text-violet-700">
            <Wand2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="page-kicker text-violet-700">Optional</p>
            <h2 id="ai-assistant-title" className="section-title mt-1.5">AI Event Assistant</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
              Turns your notes into a polished description, agenda, FAQs, SEO text and tier-name ideas in English and Kiswahili. It never sets prices, dates or publishes anything.
            </p>
          </div>
        </div>
        <AiBadge label="AI-powered" />
      </div>

      {!draft && !generate.isPending && (
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-navy-800">Target audience (optional)</span>
            <Input value={audience} maxLength={300} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. young professionals who love live jazz" />
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-semibold text-navy-800">
            <input type="checkbox" checked={wantSw} onChange={(e) => setWantSw(e.target.checked)} className="h-4 w-4 accent-violet-700" />
            Include Kiswahili
          </label>
          <div className="sm:col-span-2">
            {missing.length > 0 && <p className="mb-2 text-xs text-muted">Add {missing.join(', ')} above to generate.</p>}
            <Button type="button" onClick={() => generate.mutate()} disabled={missing.length > 0} className="bg-violet-700 shadow-none hover:bg-violet-800">
              <Sparkles className="h-4 w-4" aria-hidden="true" />Generate draft
            </Button>
          </div>
        </div>
      )}

      {generate.isPending && <div className="mt-5"><AiGenerating label="Writing your event copy…" /></div>}

      {draft && copy && (
        <div className="mt-5 space-y-4">
          <AiReviewNotice />
          <AiWarnings warnings={draft.output.warnings} />
          {draft.output.assumptions?.length > 0 && (
            <p className="text-xs text-muted"><strong className="text-navy-800">Assumptions to check:</strong> {draft.output.assumptions.join(' · ')}</p>
          )}

          {draft.output.sw && (
            <div className="inline-flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="Draft language">
              {(['en', 'sw'] as Lang[]).map((l) => (
                <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => { setLang(l); setEditing(false); }}
                  className={clsx('min-h-9 rounded-lg px-3.5 text-xs font-extrabold', lang === l ? 'bg-ink-900 text-white' : 'text-navy-600')}>
                  {l === 'en' ? 'English' : 'Kiswahili'}
                </button>
              ))}
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy-800">Summary</span>
                <Input value={editText.summary} maxLength={300} onChange={(e) => setEditText((t) => ({ ...t, summary: e.target.value }))} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-navy-800">Description</span>
                <Textarea rows={8} value={editText.description} maxLength={4000} onChange={(e) => setEditText((t) => ({ ...t, description: e.target.value }))} /></label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" loading={saveEdit.isPending} onClick={() => saveEdit.mutate()}><Check className="h-4 w-4" aria-hidden="true" />Save edits</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <DraftView copy={copy} />
          )}

          <div className="flex flex-wrap gap-2 border-t border-violet-100 pt-4">
            <Button type="button" size="sm" loading={decide.isPending && decide.variables === 'accept'} onClick={() => decide.mutate('accept')}>
              <Check className="h-4 w-4" aria-hidden="true" />Use this description
            </Button>
            {!editing && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setEditText({ description: copy.description, summary: copy.summary }); setEditing(true); }}>
                <PencilLine className="h-4 w-4" aria-hidden="true" />Edit
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" loading={generate.isPending} onClick={() => generate.mutate()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Regenerate
            </Button>
            <Button type="button" size="sm" variant="ghost" loading={decide.isPending && decide.variables === 'discard'} onClick={() => decide.mutate('discard')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />Discard
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** What "Use this description" puts in the form: description, agenda and FAQs as plain text. */
function composeDescription(copy: EventCopy) {
  const parts = [copy.description.trim()];
  if (copy.agenda.length) parts.push('Programme\n' + copy.agenda.map((a) => `• ${a.label} — ${a.title}${a.detail ? `: ${a.detail}` : ''}`).join('\n'));
  if (copy.faqs.length) parts.push('FAQs\n' + copy.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'));
  return parts.join('\n\n');
}

function DraftView({ copy }: { copy: EventCopy }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Summary" text={copy.summary} />
      <Block title="Description" text={copy.description} className="lg:row-span-2" />
      <Block title="Promotional headlines" text={copy.headlines.join('\n')} />
      {copy.agenda.length > 0 && <Block title="Agenda" text={copy.agenda.map((a) => `${a.label} — ${a.title}${a.detail ? `: ${a.detail}` : ''}`).join('\n')} />}
      {copy.faqs.length > 0 && <Block title="FAQs" text={copy.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')} />}
      <Block title="SEO" text={`${copy.seo.title}\n${copy.seo.metaDescription}\nKeywords: ${copy.seo.keywords.join(', ')}`} />
      {copy.ticketTierNames.length > 0 && (
        <Block
          title="Tier name ideas (you set prices)"
          text={copy.ticketTierNames.map((t) => `${t.name} (${t.category.replace('_', ' ').toLowerCase()}) — ${t.rationale}`).join('\n')}
        />
      )}
    </div>
  );
}

function Block({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-white p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-navy-400">{title}</p>
        <CopyButton text={text} label={title} />
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-800">{text}</p>
    </div>
  );
}
