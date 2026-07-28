'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard, PlusCircle, ScanLine } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/ui/Button';
import { Input, Select, Label } from '@/components/ui/Input';
import { EventCategory } from '@/types';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

// Designed posters (TicketFlow Kenya branding, frontend/public/posters/generic)
// used when an organizer doesn't upload their own image. Static per category
// rather than a keyword-search service, since LoremFlickr's Flickr-backed
// search is unreliable and often returns 500s for multi-keyword queries.
// Relative paths so the current host serves them (works on localhost and prod).
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'music & concerts': '/posters/generic/music-concerts.jpg',
  'tech & business': '/posters/generic/tech-business.jpg',
  sports: '/posters/generic/sports.jpg',
  'arts & theatre': '/posters/generic/arts-theatre.jpg',
  festivals: '/posters/generic/festivals.jpg',
};

const DEFAULT_FALLBACK_IMAGE = CATEGORY_FALLBACK_IMAGES['festivals'];

function buildFallbackPosterUrl(_title: string, categoryName?: string) {
  return (categoryName && CATEGORY_FALLBACK_IMAGES[categoryName.toLowerCase()]) || DEFAULT_FALLBACK_IMAGE;
}

function CreateEventContent() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    posterUrl: '',
    venue: '',
    city: '',
    address: '',
    startDateTime: '',
    endDateTime: '',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data as EventCategory[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const selectedCategory = categories?.find((c) => c.id === form.categoryId);
      const { data } = await api.post('/events', {
        ...form,
        posterUrl: form.posterUrl || buildFallbackPosterUrl(form.title, selectedCategory?.name),
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
      });
      return data;
    },
    onSuccess: (event) => {
      toast.success('Event created as draft. Add ticket types next.');
      router.push(`/organizer/events/${event.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-navy-900">Create Event</h1>
      <p className="mt-1 text-muted">Events start as drafts. Submit for approval once ready.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createEvent.mutate();
        }}
        className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-line bg-white p-6"
      >
        <Field label="Event title">
          <Input required value={form.title} onChange={(e) => update('title', e.target.value)} />
        </Field>

        <Field label="Description">
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="w-full rounded-btn border border-line bg-white px-3.5 py-2.5 text-[15px] text-navy-900 placeholder:text-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </Field>

        <Field label="Category">
          <Select required value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
            <option value="">Select category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Poster image URL (optional — placeholder used if blank)">
          <Input
            value={form.posterUrl}
            onChange={(e) => update('posterUrl', e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue">
            <Input required value={form.venue} onChange={(e) => update('venue', e.target.value)} />
          </Field>
          <Field label="City">
            <Input required value={form.city} onChange={(e) => update('city', e.target.value)} />
          </Field>
        </div>

        <Field label="Address (optional)">
          <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date & time">
            <Input
              required
              type="datetime-local"
              value={form.startDateTime}
              onChange={(e) => update('startDateTime', e.target.value)}
            />
          </Field>
          <Field label="End date & time">
            <Input
              required
              type="datetime-local"
              value={form.endDateTime}
              onChange={(e) => update('endDateTime', e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" disabled={createEvent.isPending} loading={createEvent.isPending}>
          {createEvent.isPending ? 'Creating...' : 'Create Event'}
        </Button>
      </form>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <CreateEventContent />
    </RequireRole>
  );
}
