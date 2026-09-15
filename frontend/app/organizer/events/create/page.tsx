'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, FileText, Image as ImageIcon, LayoutDashboard, MapPinned, PlusCircle, ScanLine, Send } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { EventCategory } from '@/types';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'music & concerts': '/posters/generic/music-concerts.jpg',
  'tech & business': '/posters/generic/tech-business.jpg',
  sports: '/posters/generic/sports.jpg',
  'arts & theatre': '/posters/generic/arts-theatre.jpg',
  festivals: '/posters/generic/festivals.jpg',
};
const DEFAULT_FALLBACK_IMAGE = CATEGORY_FALLBACK_IMAGES.festivals;

function fallbackPoster(categoryName?: string) {
  return (categoryName && CATEGORY_FALLBACK_IMAGES[categoryName.toLowerCase()]) || DEFAULT_FALLBACK_IMAGE;
}

function CreateEventContent() {
  const router = useRouter();
  const [dateError, setDateError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', posterUrl: '', venue: '', city: '', address: '', startDateTime: '', endDateTime: '' });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data as EventCategory[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const selectedCategory = categories?.find((category) => category.id === form.categoryId);
      const { data } = await api.post('/events', {
        ...form,
        posterUrl: form.posterUrl || fallbackPoster(selectedCategory?.name),
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
      });
      return data;
    },
    onSuccess: (event) => {
      toast.success('Draft created. Add ticket types before submitting it.');
      router.push(`/organizer/events/${event.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'startDateTime' || key === 'endDateTime') setDateError('');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (new Date(form.endDateTime).getTime() <= new Date(form.startDateTime).getTime()) {
      setDateError('End time must be later than the start time.');
      return;
    }
    createEvent.mutate();
  }

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="New listing" title="Create an event" description="Start with the essentials. Your event stays private as a draft until you add ticket tiers and submit it for review." />

      <form onSubmit={submit} className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
        <div className="space-y-5">
          <FormSection icon={FileText} eyebrow="Step 1" title="Basic details" description="Give customers enough information to understand the event at a glance.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event title" className="sm:col-span-2"><Input required autoComplete="off" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Nairobi Design Week" /></Field>
              <Field label="Category"><Select required value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Select category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
              <Field label="Event description" className="sm:col-span-2"><Textarea required rows={6} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What should attendees expect? Include the experience, programme and important entry information." /></Field>
            </div>
          </FormSection>

          <FormSection icon={CalendarClock} eyebrow="Step 2" title="Date and time" description="Times are saved using the platform's configured timezone.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts"><Input required type="datetime-local" value={form.startDateTime} onChange={(event) => update('startDateTime', event.target.value)} /></Field>
              <Field label="Ends"><Input required type="datetime-local" value={form.endDateTime} onChange={(event) => update('endDateTime', event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? 'event-date-error' : undefined} /></Field>
            </div>
            {dateError && <p id="event-date-error" role="alert" className="mt-2 text-sm font-semibold text-danger-700">{dateError}</p>}
          </FormSection>

          <FormSection icon={MapPinned} eyebrow="Step 3" title="Venue and location" description="Use the public venue name customers will recognize.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue"><Input required value={form.venue} onChange={(event) => update('venue', event.target.value)} placeholder="KICC" /></Field>
              <Field label="City"><Input required value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Nairobi" /></Field>
              <Field label="Street address (optional)" className="sm:col-span-2"><Input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Building, road or neighbourhood" /></Field>
            </div>
          </FormSection>

          <FormSection icon={ImageIcon} eyebrow="Step 4" title="Event imagery" description="Use a direct, publicly accessible image URL. Portrait and landscape artwork are both displayed without distortion.">
            <Field label="Poster image URL (optional)"><Input type="url" value={form.posterUrl} onChange={(event) => update('posterUrl', event.target.value)} placeholder="https://example.com/event-poster.jpg" /><p className="mt-2 text-xs leading-relaxed text-muted">If blank, TicketFlow applies the built-in category placeholder. You can replace it before submitting for approval.</p></Field>
          </FormSection>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
          <div className="rounded-card bg-ink-950 p-5 text-white shadow-card">
            <p className="page-kicker text-brand-300">Draft workflow</p>
            <h2 className="mt-2 text-lg font-extrabold">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm text-white/65">
              <li><strong className="text-white">1.</strong> Save this event as a private draft.</li>
              <li><strong className="text-white">2.</strong> Add prices and inventory for each ticket tier.</li>
              <li><strong className="text-white">3.</strong> Submit the complete listing for admin review.</li>
            </ol>
          </div>
          <div className="rounded-card border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-navy-900">Ready to save?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Save your draft, then add ticket options before submitting your event for review.</p>
            <Button type="submit" fullWidth className="mt-4" loading={createEvent.isPending}>
              <Send className="h-4 w-4" aria-hidden="true" />Create draft
            </Button>
          </div>
        </aside>
      </form>
    </DashboardLayout>
  );
}

function FormSection({ icon: Icon, eyebrow, title, description, children }: { icon: typeof FileText; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="page-kicker">{eyebrow}</p><h2 className="section-title mt-1.5">{title}</h2><p className="mt-1 text-xs leading-relaxed text-muted">{description}</p></div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-1.5 block text-sm font-medium text-navy-800">{label}</span>{children}</label>;
}

export default function CreateEventPage() {
  return <RequireRole roles={['ORGANIZER']}><CreateEventContent /></RequireRole>;
}
