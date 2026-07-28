'use client';

import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'recommended' | 'soonest' | 'newest' | 'price-asc' | 'price-desc';

export const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  soonest: 'Soonest',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

export default function EventSort({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-btn border border-line bg-white px-3.5 text-sm font-medium text-navy-800">
      <ArrowUpDown className="h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
      <span className="sr-only">Sort events</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-full min-w-[9rem] cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-navy-800 focus:outline-none focus:ring-0"
      >
        {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
