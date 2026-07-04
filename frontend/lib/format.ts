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
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

export function formatTicketCategory(category: string): string {
  return category.replace('_', ' ');
}

/** "3-5 Jul 2026" for multi-day events, "3 Jul 2026" when start and end fall on the same day. */
export function formatDateRange(start: string | Date, end: string | Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(startDate);
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const startDay = new Intl.DateTimeFormat('en-KE', { day: 'numeric' }).format(startDate);
  const endLabel = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(endDate);

  return sameMonth ? `${startDay}-${endLabel}` : `${startDay} ${new Intl.DateTimeFormat('en-KE', { month: 'short' }).format(startDate)} - ${endLabel}`;
}
