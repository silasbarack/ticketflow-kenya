'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending = false,
  children,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCloseRef.current();
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, pending]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-ink-950/65 backdrop-blur-[2px]"
        onClick={() => !pending && onClose()}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative w-full max-w-md rounded-t-panel border border-line bg-white p-5 shadow-elevated sm:rounded-panel sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={pending}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-navy-900/5 hover:text-navy-900"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-danger-50 text-danger-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="confirm-dialog-title" className="mt-4 pr-10 text-xl font-extrabold tracking-[-0.025em] text-navy-900">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} type="button" variant="outline" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
