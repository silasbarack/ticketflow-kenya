'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LifeBuoy, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AiBadge } from '@/components/ai/AiBits';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'AGENT';
  content: string;
  aiGenerated?: boolean;
  feedback?: number | null;
}

interface ChatReply {
  conversationId: string;
  accessToken?: string;
  message: { id: string; content: string; aiGenerated: boolean };
  needsHuman: boolean;
  suggestedLinks: { label: string; href: string }[];
  events: { id: string; title: string; starts: string; venue: string; city: string }[];
  escalationAvailable: boolean;
}

/** Signed-out conversations are resumable in this tab only (sessionStorage). */
const STORE_KEY = 'tfk_support_chat';
const AI_LOGO = '/brand/ticketflow-ai-logo.png';
const AI_MARK = '/brand/ticketflow-ai-mark.png';
const HIDDEN_ON = ['/admin', '/checkout'];

function loadSession(): { conversationId: string; accessToken: string } | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SupportChat() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [extras, setExtras] = useState<Pick<ChatReply, 'suggestedLinks' | 'events' | 'needsHuman'> | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(user);
  const prefix = signedIn ? '/support/me' : '/support';
  const headers = !signedIn && accessToken ? { 'x-support-token': accessToken } : undefined;

  // Reset when the account changes; resume an anonymous chat in this tab.
  useEffect(() => {
    if (loading) return;
    setMessages([]);
    setConversationId(null);
    setTicketRef(null);
    setExtras(null);
    if (!user) {
      const saved = loadSession();
      if (saved) {
        setConversationId(saved.conversationId);
        setAccessToken(saved.accessToken);
        api
          .get(`/support/conversations/${saved.conversationId}`, { headers: { 'x-support-token': saved.accessToken } })
          .then(({ data }) => {
            setMessages(data.messages);
            if (data.ticket) setTicketRef(data.ticket.reference);
          })
          .catch(() => sessionStorage.removeItem(STORE_KEY));
      }
    }
  }, [user, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, escalating]);

  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'USER', content: text }]);
    setSending(true);
    try {
      const { data } = await api.post<ChatReply>(`${prefix}/chat`, { message: text, conversationId: conversationId ?? undefined }, { headers });
      setConversationId(data.conversationId);
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        try {
          sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId: data.conversationId, accessToken: data.accessToken }));
        } catch {
          /* private mode: chat still works for this page view */
        }
      }
      setMessages((m) => [...m, { id: data.message.id, role: 'ASSISTANT', content: data.message.content, aiGenerated: data.message.aiGenerated }]);
      setExtras({ suggestedLinks: data.suggestedLinks, events: data.events, needsHuman: data.needsHuman });
    } catch (error) {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'ASSISTANT', content: `Sorry — ${getApiErrorMessage(error)} You can email support@ticketflow.co.ke.` }]);
    } finally {
      setSending(false);
    }
  }

  async function rate(id: string, value: 1 | -1) {
    try {
      await api.post(`${prefix}/messages/${id}/feedback`, { value }, { headers });
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, feedback: value } : msg)));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  function newChat() {
    try {
      sessionStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setConversationId(null);
    setAccessToken(null);
    setTicketRef(null);
    setExtras(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="support-chat"
        className={clsx(
          'fixed bottom-4 right-4 z-40 flex h-14 items-center gap-2 rounded-full text-sm font-extrabold shadow-elevated transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6',
          open ? 'bg-ink-900 px-5 text-white' : 'border border-line bg-white pl-1.5 pr-1.5 text-navy-900 sm:pr-5',
        )}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={AI_MARK} alt="" width={44} height={44} className="h-11 w-11" />
        )}
        <span className="hidden sm:inline">{open ? 'Close' : 'Ask TicketFlow AI'}</span>
        <span className="sr-only sm:hidden">{open ? 'Close help' : 'Open help'}</span>
      </button>

      {open && (
        <section
          id="support-chat"
          aria-label="TicketFlow support"
          className="fixed inset-x-2 bottom-20 top-[calc(var(--header-height)+0.5rem)] z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-elevated sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:max-h-[min(640px,calc(100dvh-var(--header-height)-8rem))] sm:w-[400px]"
        >
          <header className="flex items-center justify-between gap-2 border-b-2 border-brand-600 bg-white px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AI_LOGO} alt="TicketFlow AI Kenya" width={77} height={56} className="h-14 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-navy-900">Support assistant</p>
                <p className="text-[11px] leading-snug text-muted">{signedIn ? 'Signed in — I can check your own orders' : 'Sign in for help with a specific booking'}</p>
              </div>
            </div>
            {messages.length > 0 && <button type="button" onClick={newChat} className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-navy-600 hover:bg-navy-900/5 hover:text-navy-900">New chat</button>}
          </header>

          <div ref={scrollRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-navy-700">
                <p>Hi! Ask me about events, tickets, M-Pesa payments or refunds. Unaweza kuuliza kwa Kiswahili pia.</p>
                <div className="flex flex-wrap gap-2">
                  {['How do I pay with M-Pesa?', 'Where are my tickets?', 'What is the refund policy?'].map((q) => (
                    <button key={q} type="button" onClick={() => setDraft(q)} className="filter-chip text-xs">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={clsx('relative flex flex-col', m.role === 'USER' ? 'items-end' : 'items-start', m.role === 'ASSISTANT' && 'pl-9')}>
                {m.role === 'ASSISTANT' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={AI_MARK} alt="" width={28} height={28} className="absolute left-0 top-0.5 h-7 w-7" />
                )}
                <div className={clsx('max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', m.role === 'USER' ? 'bg-brand-600 text-white' : m.role === 'AGENT' ? 'bg-emerald-50 text-navy-900' : 'bg-navy-900/[0.05] text-navy-900')}>
                  {m.role === 'AGENT' && <span className="mb-1 block text-[11px] font-extrabold text-emerald-700">TicketFlow team</span>}
                  {m.content}
                </div>
                {m.role === 'ASSISTANT' && !m.id.startsWith('err-') && (
                  <div className="mt-1 flex items-center gap-1.5">
                    {m.aiGenerated !== false ? <AiBadge className="!py-0.5" /> : <span className="text-[11px] font-semibold text-muted">From the help centre</span>}
                    <button type="button" aria-label="Helpful" aria-pressed={m.feedback === 1} onClick={() => rate(m.id, 1)} className={clsx('rounded p-1', m.feedback === 1 ? 'text-emerald-600' : 'text-navy-300 hover:text-navy-700')}><ThumbsUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Not helpful" aria-pressed={m.feedback === -1} onClick={() => rate(m.id, -1)} className={clsx('rounded p-1', m.feedback === -1 ? 'text-brand-600' : 'text-navy-300 hover:text-navy-700')}><ThumbsDown className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            {sending && <p className="text-xs font-semibold text-muted" role="status">Typing…</p>}

            {extras && !sending && (extras.events.length > 0 || extras.suggestedLinks.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {extras.events.map((e) => <Link key={e.id} href={`/events/${e.id}`} className="filter-chip text-xs">{e.title}</Link>)}
                {extras.suggestedLinks.map((l) => <Link key={l.href} href={l.href} className="filter-chip text-xs">{l.label}</Link>)}
              </div>
            )}

            {ticketRef ? (
              <p className="rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-900">Support ticket <strong>{ticketRef}</strong> created. The team will reply by email.</p>
            ) : escalating ? (
              <EscalateForm signedIn={signedIn} conversationId={conversationId} headers={headers} onDone={(ref) => { setTicketRef(ref); setEscalating(false); }} onCancel={() => setEscalating(false)} />
            ) : (
              messages.length > 0 && (
                <button type="button" onClick={() => setEscalating(true)} className={clsx('flex items-center gap-1.5 text-xs font-bold', extras?.needsHuman ? 'text-brand-700' : 'text-navy-500 hover:text-navy-900')}>
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />Talk to a person
                </button>
              )
            )}
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <label className="sr-only" htmlFor="support-input">Your question</label>
            <Textarea id="support-input" rows={1} maxLength={1500} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
              placeholder="Type your question…" className="max-h-32 min-h-[44px] resize-none" />
            <Button type="submit" size="sm" aria-label="Send" disabled={!draft.trim() || sending}><Send className="h-4 w-4" aria-hidden="true" /></Button>
          </form>
          <p className="border-t border-line px-4 py-2 text-[10.5px] leading-snug text-muted">
            Answers may be AI-generated and can be wrong. Never share your M-Pesa PIN. <Link href="/legal/privacy-policy" className="underline">Privacy</Link>
          </p>
        </section>
      )}
    </>
  );
}

function EscalateForm({ signedIn, conversationId, headers, onDone, onCancel }: {
  signedIn: boolean; conversationId: string | null; headers?: Record<string, string>;
  onDone: (reference: string) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ category: 'PAYMENT', subject: '', description: '', contactEmail: '', orderNumber: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(signedIn ? '/support/me/tickets' : '/support/tickets', {
        conversationId: conversationId ?? undefined,
        category: form.category,
        subject: form.subject,
        description: form.description,
        contactEmail: signedIn ? undefined : form.contactEmail,
        orderNumber: signedIn && form.orderNumber ? form.orderNumber : undefined,
      }, { headers });
      onDone(data.reference);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-line bg-white p-3">
      <p className="text-xs font-extrabold text-navy-900">Create a support ticket</p>
      <Select value={form.category} onChange={set('category')} aria-label="Topic">
        <option value="PAYMENT">Payment problem</option>
        <option value="TICKET_ACCESS">Can&apos;t access my tickets</option>
        <option value="REFUND">Refund request</option>
        <option value="EVENT_INFO">Event question</option>
        <option value="ORGANIZER">Organiser help</option>
        <option value="ACCOUNT">Account</option>
        <option value="OTHER">Something else</option>
      </Select>
      <Input required minLength={3} maxLength={140} value={form.subject} onChange={set('subject')} placeholder="Short summary" aria-label="Subject" />
      <Textarea required minLength={10} maxLength={4000} rows={3} value={form.description} onChange={set('description')} placeholder="What happened? Include your M-Pesa transaction code if it's about a payment. Never include your PIN." aria-label="Details" />
      {signedIn ? (
        <Input maxLength={40} value={form.orderNumber} onChange={set('orderNumber')} placeholder="Order number (optional)" aria-label="Order number" />
      ) : (
        <Input required type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="Your email for the reply" aria-label="Email" />
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>Send to support</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
