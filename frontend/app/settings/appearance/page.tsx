'use client';

import { Check } from 'lucide-react';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';
import { BG_COLOR_OPTIONS } from '@/lib/appearance';
import Container from '@/components/ui/Container';

export default function AppearanceSettingsPage() {
  const { color, setColor } = useBackgroundColor();

  return (
    <Container className="max-w-2xl py-10">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-navy-900">Appearance</h1>
        <p className="mt-1 text-sm text-muted">
          Choose a background colour for the site. This only affects your browser — no one else will see it.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {BG_COLOR_OPTIONS.map((option) => {
            const selected = color.toLowerCase() === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                aria-pressed={selected}
                className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition ${
                  selected ? 'border-brand-600 bg-brand-50/40' : 'border-line hover:border-navy-300'
                }`}
              >
                {selected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
                <span
                  className="h-14 w-14 rounded-full border border-line"
                  style={{ backgroundColor: option.value }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-navy-900">{option.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
