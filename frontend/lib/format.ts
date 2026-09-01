export const KENYA_TIME_ZONE = 'Africa/Nairobi';

export function formatCurrency(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeZone: KENYA_TIME_ZONE }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: KENYA_TIME_ZONE,
  }).format(new Date(date));
}

export function formatTicketCategory(category: string): string {
  return category.replace('_', ' ');
}

/** "3-5 Jul 2026" for multi-day events, "3 Jul 2026" when start and end fall on the same day. */
export function formatDateRange(start: string | Date, end: string | Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const keyFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: KENYA_TIME_ZONE,
  });
  const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: KENYA_TIME_ZONE,
  });
  const sameDay = keyFormatter.format(startDate) === keyFormatter.format(endDate);

  if (sameDay) {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: KENYA_TIME_ZONE,
    }).format(startDate);
  }

  const sameMonth = monthKeyFormatter.format(startDate) === monthKeyFormatter.format(endDate);
  const startDay = new Intl.DateTimeFormat('en-KE', { day: 'numeric', timeZone: KENYA_TIME_ZONE }).format(startDate);
  const endLabel = new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: KENYA_TIME_ZONE,
  }).format(endDate);

  return sameMonth
    ? `${startDay}-${endLabel}`
    : `${startDay} ${new Intl.DateTimeFormat('en-KE', { month: 'short', timeZone: KENYA_TIME_ZONE }).format(startDate)} - ${endLabel}`;
}
