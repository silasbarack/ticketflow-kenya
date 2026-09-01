export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventDateTime(iso: string): string {
  return `${formatEventDate(iso)} · ${formatEventTime(iso)}`;
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatEventDate(iso);
}
