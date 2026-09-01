import { EventItem } from '@/types/event';

/**
 * Offline mode intentionally publishes no event claims. Real-event dates,
 * prices, availability, posters and seller links must come from the verified
 * backend catalogue rather than a stale or invented fallback.
 */
export const MOCK_EVENTS: EventItem[] = [];

export function findMockEvent(eventId: string): EventItem | undefined {
  return MOCK_EVENTS.find((event) => event.id === eventId);
}
