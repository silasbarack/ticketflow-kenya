'use client';

import { ClipboardEvent, KeyboardEvent, useRef } from 'react';
import clsx from 'clsx';

const LENGTH = 6;

/**
 * Six single-digit boxes that behave like one field: typing advances, Backspace
 * steps back, arrow keys move, and pasting a whole code (even "482 731" or
 * "Code: 482731") fills every box at once. Anything but digits is ignored.
 */
export default function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  idPrefix = 'code',
}: {
  value: string;
  onChange: (code: string) => void;
  /** Fired when the sixth digit lands. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const focus = (index: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    // Some mobile keyboards deliver the whole one-time code into one box.
    if (typed.length > 1) {
      commit(value.slice(0, index) + typed);
      focus(index + typed.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    commit(chars.join(''));
    focus(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = digits.slice();
      if (chars[index]) {
        chars[index] = '';
      } else if (index > 0) {
        chars[index - 1] = '';
        focus(index - 1);
      }
      onChange(chars.join('').slice(0, LENGTH));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focus(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focus(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    commit(pasted);
    focus(pasted.length);
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="6-digit verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`${idPrefix}-${i}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={clsx(
            'tnum h-14 w-full min-w-0 rounded-btn border bg-cream/60 text-center text-2xl font-bold text-navy-900 transition sm:h-16',
            'focus:bg-white focus:outline-none focus:ring-4',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid
              ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/10'
              : 'border-line focus:border-brand-500 focus:ring-brand-500/10',
          )}
        />
      ))}
    </div>
  );
}
