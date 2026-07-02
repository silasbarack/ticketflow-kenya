'use client';

import { useBackgroundColor } from '@/hooks/useBackgroundColor';

const PRESETS = [
  { name: 'Default', value: '#f9fafb' },
  { name: 'White', value: '#ffffff' },
  { name: 'Warm cream', value: '#fdf6e9' },
  { name: 'Soft green', value: '#f0fdf4' },
  { name: 'Soft blue', value: '#eff6ff' },
  { name: 'Dark slate', value: '#111827' },
];

export default function AppearanceSettingsPage() {
  const { color, defaultColor, setColor, reset } = useBackgroundColor();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a background colour for the site. This only affects your browser — no one else will see it.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Background colour"
            className="h-12 w-16 cursor-pointer rounded-lg border border-gray-300"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">{color}</p>
            <p className="text-xs text-gray-500">Pick a custom colour or choose a preset below</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Presets</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setColor(preset.value)}
                title={preset.name}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  color.toLowerCase() === preset.value ? 'border-brand-600' : 'border-gray-200'
                }`}
                style={{ backgroundColor: preset.value }}
                aria-label={preset.name}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={color === defaultColor}
          className="mt-8 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to default
        </button>
      </div>
    </main>
  );
}
