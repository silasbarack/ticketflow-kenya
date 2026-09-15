'use client';

import clsx from 'clsx';

export default function FilterTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="snap-row gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx('filter-chip shrink-0', value === option.value && 'border-brand-600 bg-brand-600 text-white')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
