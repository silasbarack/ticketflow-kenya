'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * The four stops of the TicketFlow booking flow. `attendees` only appears when
 * the buyer is taking two or more tickets — a single-ticket order is issued to
 * the account holder, so there is nothing extra to collect.
 */
export type BookingStepId = 'tickets' | 'attendees' | 'confirm' | 'pay';

const ALL_STEPS: { id: BookingStepId; label: string; hint: string }[] = [
  { id: 'tickets', label: 'Tickets', hint: 'Pick your tier' },
  { id: 'attendees', label: 'Attendees', hint: 'Who is coming' },
  { id: 'confirm', label: 'Confirm number', hint: 'M-Pesa number' },
  { id: 'pay', label: 'Pay', hint: 'STK push' },
];

export default function BookingSteps({
  current,
  showAttendees,
  className,
}: {
  current: BookingStepId;
  showAttendees: boolean;
  className?: string;
}) {
  const steps = ALL_STEPS.filter((s) => s.id !== 'attendees' || showAttendees);
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <ol className={clsx('flex items-stretch gap-2 sm:gap-3', className)}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;

        return (
          <li key={step.id} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 flex-col gap-2">
            {/* The rail is the primary progress signal; the label repeats it in words. */}
            <span
              className={clsx(
                'h-1 rounded-full transition-colors',
                done ? 'bg-brand-500' : active ? 'bg-brand-600' : 'bg-navy-200',
              )}
              aria-hidden="true"
            />
            <span className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  done ? 'bg-brand-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-navy-100 text-navy-500',
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={clsx(
                    'block truncate text-[13px] font-semibold leading-tight',
                    active ? 'text-brand-700' : done ? 'text-navy-800' : 'text-muted',
                  )}
                >
                  {step.label}
                  {active && <span className="sr-only"> (current step)</span>}
                </span>
                <span className="hidden truncate text-[11px] text-muted sm:block">{step.hint}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
