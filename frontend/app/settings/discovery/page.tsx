'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Compass, ShieldCheck } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { EventCategory } from '@/types';

interface Preferences { personalizationConsent: boolean; preferredCategoryIds: string[]; preferredCities: string[] }

function DiscoverySettingsContent() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: ['discovery-prefs'], queryFn: async () => (await api.get<Preferences>('/discovery/me/preferences')).data });
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<EventCategory[]>('/categories')).data });
  const [form, setForm] = useState<Preferences>({ personalizationConsent: false, preferredCategoryIds: [], preferredCities: [] });
  const [cities, setCities] = useState('');

  useEffect(() => {
    if (prefs.data) {
      setForm(prefs.data);
      setCities(prefs.data.preferredCities.join(', '));
    }
  }, [prefs.data]);

  const save = useMutation({
    mutationFn: async () =>
      (await api.put('/discovery/me/preferences', {
        ...form,
        preferredCities: cities.split(',').map((c) => c.trim()).filter(Boolean),
      })).data,
    onSuccess: () => {
      toast.success(form.personalizationConsent ? 'Preferences saved' : 'Saved. Browsing history used for recommendations has been deleted.');
      qc.invalidateQueries({ queryKey: ['discovery-prefs'] });
      qc.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const toggleCategory = (id: string) =>
    setForm((f) => ({ ...f, preferredCategoryIds: f.preferredCategoryIds.includes(id) ? f.preferredCategoryIds.filter((c) => c !== id) : [...f.preferredCategoryIds, id] }));

  return (
    <main className="min-h-[calc(100vh-var(--header-height))] bg-cream py-8 sm:py-11">
      <Container className="max-w-3xl">
        <PageHeader eyebrow="Preferences" title="Event recommendations" description="Choose what TicketFlow may use to suggest events. You can change this at any time." />

        {prefs.isLoading ? <Skeleton className="mt-7 h-80 rounded-card" /> : (
          <div className="mt-7 space-y-5">
            <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
                <div className="flex-1">
                  <h2 className="section-title">Personalise using my activity</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    When on, we use the events you view and the tickets you buy on TicketFlow to rank suggestions. Only the last 90 days of views count, and your viewing history is deleted as soon as you turn this off. It is never shared with organisers or sent to AI providers.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-navy-800">
                  <span>{form.personalizationConsent ? 'On' : 'Off'}</span>
                  <input type="checkbox" role="switch" aria-checked={form.personalizationConsent} aria-label="Personalise using my activity" checked={form.personalizationConsent}
                    onChange={(e) => setForm((f) => ({ ...f, personalizationConsent: e.target.checked }))}
                    className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-navy-900/15 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-emerald-600 checked:before:translate-x-[18px]" />
                </label>
              </div>
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><Compass className="h-5 w-5" aria-hidden="true" /></span>
                <div><h2 className="section-title">What I like</h2><p className="mt-1 text-sm text-muted">Explicit choices — used even when activity-based personalisation is off.</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {categories.data?.map((c) => (
                  <button key={c.id} type="button" aria-pressed={form.preferredCategoryIds.includes(c.id)} onClick={() => toggleCategory(c.id)}
                    className={clsx('filter-chip', form.preferredCategoryIds.includes(c.id) && 'border-brand-600 bg-brand-600 text-white')}>{c.name}</button>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-medium text-navy-800">Cities (comma separated)</span>
                <Input value={cities} maxLength={300} onChange={(e) => setCities(e.target.value)} placeholder="Nairobi, Mombasa" />
              </label>
            </section>

            <Button type="button" loading={save.isPending} onClick={() => save.mutate()}>Save preferences</Button>
          </div>
        )}
      </Container>
    </main>
  );
}

export default function DiscoverySettingsPage() {
  return <RequireRole roles={['CUSTOMER', 'ORGANIZER', 'ADMIN']}><DiscoverySettingsContent /></RequireRole>;
}
