'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

export default function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    setOpen(false);
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : '/events');
  }

  return (
    <div ref={wrapRef} className="relative">
      <IconButton aria-label="Search events" onClick={() => setOpen((v) => !v)}>
        <Search className="h-5 w-5" aria-hidden="true" />
      </IconButton>

      {open && (
        <form
          onSubmit={submit}
          role="search"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-72 items-center gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-elevated sm:w-80"
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="search"
            placeholder="Search events, artists, venues..."
            aria-label="Search events"
            className="h-10 flex-1 rounded-xl border-0 bg-transparent px-3 text-sm text-navy-900 placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-navy-400 hover:bg-navy-900/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}
