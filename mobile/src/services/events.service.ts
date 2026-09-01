import { USE_MOCK_DATA } from '@/constants/config';
import { MOCK_EVENTS, findMockEvent } from '@/data/mock-events';
import { EventItem, EventListResponse, TicketType } from '@/types/event';
import { api } from './api';
import { mapEvent } from './backend-mappers';
import { delay } from './mock-state';

export interface EventListParams {
  search?: string;
  category?: string;
}

interface EventsService {
  list(params?: EventListParams): Promise<EventListResponse>;
  featured(): Promise<EventItem[]>;
  getById(eventId: string): Promise<EventItem>;
  getTicketTypes(eventId: string): Promise<TicketType[]>;
}

interface BackendEventList {
  events: Record<string, any>[];
  total: number;
}

const realEventsService: EventsService = {
  async list(params) {
    // `GET /events` only supports a text search server-side; category is a
    // relation there and our chips are plain names, so it is applied locally.
    const { data } = await api.get<BackendEventList>('/events', {
      params: { search: params?.search, take: 50 },
    });
    let events = (data.events ?? []).map(mapEvent);
    if (params?.category && params.category !== 'All') {
      events = events.filter((e) => e.category === params.category);
    }
    return { events, total: events.length };
  },
  async featured() {
    // No dedicated featured endpoint — filter the published list instead.
    const { data } = await api.get<BackendEventList>('/events', { params: { take: 50 } });
    return (data.events ?? []).map(mapEvent).filter((e) => e.featured);
  },
  async getById(eventId) {
    const { data } = await api.get<Record<string, any>>(`/events/${eventId}`);
    return mapEvent(data);
  },
  async getTicketTypes(eventId) {
    const { data } = await api.get<Record<string, any>>(`/events/${eventId}`);
    return mapEvent(data).ticketTypes;
  },
};

function matchesSearch(event: EventItem, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [event.title, event.venue, event.city, event.organizerName].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

const mockEventsService: EventsService = {
  async list(params) {
    await delay(500);
    let events = MOCK_EVENTS;
    if (params?.category && params.category !== 'All') {
      events = events.filter((e) => e.category === params.category);
    }
    if (params?.search) {
      events = events.filter((e) => matchesSearch(e, params.search!));
    }
    return { events, total: events.length };
  },
  async featured() {
    await delay(400);
    return MOCK_EVENTS.filter((e) => e.featured);
  },
  async getById(eventId) {
    await delay(400);
    const event = findMockEvent(eventId);
    if (!event) {
      const error = new Error('Event not found') as Error & { code: string };
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }
    return event;
  },
  async getTicketTypes(eventId) {
    await delay(300);
    const event = findMockEvent(eventId);
    return event?.ticketTypes ?? [];
  },
};

export const eventsService: EventsService = USE_MOCK_DATA ? mockEventsService : realEventsService;
