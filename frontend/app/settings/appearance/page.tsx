'use client';

import { useBackgroundColor } from '@/hooks/useBackgroundColor';
import { BG_COLOR_OPTIONS } from '@/lib/appearance';

export default function AppearanceSettingsPage() {
  const { color, setColor } = useBackgroundColor();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
        <p className="mt-1 text-sm text-gray-500">
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
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition ${
                  selected ? 'border-brand-600' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className="h-14 w-14 rounded-full border border-gray-300"
                  style={{ backgroundColor: option.value }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-gray-900">{option.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
