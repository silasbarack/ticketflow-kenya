const COLORS: Record<string, string> = {
  DRAFT: 'bg-navy-900/[0.06] text-navy-700 ring-navy-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-800 ring-amber-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-danger-50 text-danger-700 ring-danger-200',
  CANCELLED: 'bg-danger-50 text-danger-700 ring-danger-200',
  COMPLETED: 'bg-navy-900/[0.06] text-navy-700 ring-navy-200',
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-danger-50 text-danger-700 ring-danger-200',
  // An unanswered STK prompt — recoverable by sending a new one, so it reads as
  // a warning rather than a failure.
  EXPIRED: 'bg-accent-50 text-accent-800 ring-accent-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  USED: 'bg-navy-900/[0.06] text-navy-700 ring-navy-200',
  REFUNDED: 'bg-amber-50 text-amber-800 ring-amber-200',
};

export default function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] || 'bg-navy-900/[0.06] text-navy-700 ring-navy-200';
  return (
    <span
      className={`eyebrow inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1.5 ring-1 ring-inset ${color}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
