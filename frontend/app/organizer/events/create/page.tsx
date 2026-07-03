'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import { EventCategory } from '@/types';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: '\u{1F4CA}' },
  { label: 'Create Event', href: '/organizer/events/create', icon: '➕' },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: '\u{1F4F1}' },
];

// Real Kenyan photos (Wikimedia Commons) used as a poster when an organizer
// doesn't upload one. Static per category rather than a keyword-search
// service, since LoremFlickr's Flickr-backed search is unreliable and often
// returns 500s for multi-keyword queries.
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'music & concerts': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Music_Festival_Safaricom_Stadium_Kasarani.jpg',
  'tech & business':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Overnight_gaming_%26_LAN_party_at_iHub_Nairobi.jpg/1280px-Overnight_gaming_%26_LAN_party_at_iHub_Nairobi.jpg',
  sports:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/A_few_minutes_before_the_match%2C_Kasarani%2C_Nairobi.jpg/1280px-A_few_minutes_before_the_match%2C_Kasarani%2C_Nairobi.jpg',
  'arts & theatre':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Bomas_of_Kenya%2C_Nairobi_%2854078773523%29.jpg/1280px-Bomas_of_Kenya%2C_Nairobi_%2854078773523%29.jpg',
  festivals: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Maasai_women_jumping.jpg',
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
      <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
      <p className="mt-1 text-gray-500">Events start as drafts. Submit for approval once ready.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createEvent.mutate();
        }}
        className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <Field label="Event title">
          <input
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Category">
          <select
            required
            value={form.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Poster image URL (optional — placeholder used if blank)">
          <input
            value={form.posterUrl}
            onChange={(e) => update('posterUrl', e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue">
            <input
              required
              value={form.venue}
              onChange={(e) => update('venue', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="City">
            <input
              required
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Address (optional)">
          <input
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date & time">
            <input
              required
              type="datetime-local"
              value={form.startDateTime}
              onChange={(e) => update('startDateTime', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="End date & time">
            <input
              required
              type="datetime-local"
              value={form.endDateTime}
              onChange={(e) => update('endDateTime', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={createEvent.isPending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {createEvent.isPending ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
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
