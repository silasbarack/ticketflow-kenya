'use client';

import { Check, Palette, RotateCcw } from 'lucide-react';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';
import { BG_COLOR_OPTIONS } from '@/lib/appearance';
import RequireRole from '@/components/RequireRole';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';

function AppearanceSettingsContent() {
  const { color, setColor, reset, defaultColor } = useBackgroundColor();

  return (
    <main className="min-h-[calc(100vh-var(--header-height))] bg-cream py-8 sm:py-11">
      <Container className="max-w-3xl">
        <PageHeader eyebrow="Preferences" title="Appearance" description="Choose a neutral page background. Your preference is stored only in this browser." actions={<Button variant="outline" size="sm" onClick={reset} disabled={color.toLowerCase() === defaultColor.toLowerCase()}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</Button>} />

        <section className="mt-7 rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><Palette className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="section-title">Page background</h2><p className="mt-0.5 text-xs text-muted">Brand red and component colours remain unchanged.</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {BG_COLOR_OPTIONS.map((option) => {
              const selected = color.toLowerCase() === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setColor(option.value)} aria-pressed={selected} className={`relative flex min-h-36 flex-col items-start justify-end rounded-card border-2 p-4 text-left transition ${selected ? 'border-brand-600 bg-brand-50/45' : 'border-line bg-cream/45 hover:border-navy-300'}`}>
                  <span className="absolute inset-x-4 top-4 h-16 rounded-btn border border-line shadow-inner" style={{ backgroundColor: option.value }} aria-hidden="true" />
                  <span className="mt-20 flex w-full items-center justify-between gap-2 text-sm font-bold text-navy-900">{option.name}{selected && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>}</span>
                </button>
              );
            })}
          </div>
        </section>
      </Container>
    </main>
  );
}

export default function AppearanceSettingsPage() {
  return <RequireRole roles={['CUSTOMER', 'ORGANIZER', 'ADMIN']}><AppearanceSettingsContent /></RequireRole>;
}
