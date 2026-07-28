'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { EventCategory } from '@/types';
import { Input, Label, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export interface EventFiltersValue {
  search: string;
  categoryId: string;
  city: string;
  fromDate: string;
  minPrice: string;
  maxPrice: string;
  freeOnly: boolean;
  availableOnly: boolean;
}

export const EMPTY_FILTERS: EventFiltersValue = {
  search: '',
  categoryId: '',
  city: '',
  fromDate: '',
  minPrice: '',
  maxPrice: '',
  freeOnly: false,
  availableOnly: false,
};

export function hasActiveFilters(filters: EventFiltersValue): boolean {
  return Object.entries(filters).some(([key, value]) => (key === 'freeOnly' || key === 'availableOnly' ? value : Boolean(value)));
}

/** The actual filter controls — shared between the desktop row and the mobile bottom sheet. */
export function EventFilterFields({
  filters,
  onChange,
  categories,
}: {
  filters: EventFiltersValue;
  onChange: (next: EventFiltersValue) => void;
  categories: EventCategory[] | undefined;
}) {
  function set<K extends keyof EventFiltersValue>(key: K, value: EventFiltersValue[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-1">
        <Label htmlFor="filter-category">Category</Label>
        <Select id="filter-category" value={filters.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="lg:col-span-1">
        <Label htmlFor="filter-city">Location</Label>
        <Input id="filter-city" value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder="Any city" />
      </div>

      <div className="lg:col-span-1">
        <Label htmlFor="filter-date">From date</Label>
        <Input id="filter-date" type="date" value={filters.fromDate} onChange={(e) => set('fromDate', e.target.value)} />
      </div>

      <div className="lg:col-span-2">
        <Label htmlFor="filter-min-price">Price range (KES)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="filter-min-price"
            type="number"
            min={0}
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(e) => set('minPrice', e.target.value)}
            placeholder="Min"
            disabled={filters.freeOnly}
          />
          <span className="shrink-0 text-muted">&ndash;</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(e) => set('maxPrice', e.target.value)}
            placeholder="Max"
            disabled={filters.freeOnly}
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div className="flex flex-col justify-end gap-2 lg:col-span-1">
        <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line px-3.5 text-sm font-medium text-navy-800">
          <input
            type="checkbox"
            checked={filters.freeOnly}
            onChange={(e) => set('freeOnly', e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
          />
          Free events only
        </label>
        <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line px-3.5 text-sm font-medium text-navy-800">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(e) => set('availableOnly', e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
          />
          Tickets available
        </label>
      </div>
    </div>
  );
}

/** Mobile bottom sheet wrapping EventFilterFields. */
export function EventFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onClear,
  categories,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: EventFiltersValue;
  onChange: (next: EventFiltersValue) => void;
  onClear: () => void;
  categories: EventCategory[] | undefined;
  resultCount?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-navy-900/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter events"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-elevated"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-navy-900/5">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <EventFilterFields filters={filters} onChange={onChange} categories={categories} />

        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={onClear}>
            Clear all
          </Button>
          <Button variant="primary" fullWidth onClick={onClose}>
            Show {typeof resultCount === 'number' ? `${resultCount} ` : ''}results
          </Button>
        </div>
      </div>
    </div>
  );
}
