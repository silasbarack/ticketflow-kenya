'use client';

import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-danger-200 bg-danger-50 px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-danger-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-navy-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
