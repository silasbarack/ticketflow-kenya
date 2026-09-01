import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL, USE_MOCK_DATA } from '@/constants/config';
import { findMockEvent } from '@/data/mock-events';
import { Order } from '@/types/order';
import { Ticket, ValidateTicketRequest, ValidateTicketResponse } from '@/types/ticket';
import { formatEventDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { api } from './api';
import { mapTicket } from './backend-mappers';
import { TokenStorage } from './secure-storage';
import { delay, mockState, randomId, randomQrToken } from './mock-state';

interface TicketsService {
  listMine(): Promise<Ticket[]>;
  getById(ticketId: string): Promise<Ticket>;
  /** Downloads (or, in mock mode, generates) the ticket document and returns a local file URI ready to share. */
  downloadDocument(ticketId: string): Promise<string>;
  validate(input: ValidateTicketRequest): Promise<ValidateTicketResponse>;
}

const realTicketsService: TicketsService = {
  async listMine() {
    const { data } = await api.get<Record<string, any>[]>('/tickets/my');
    return (data ?? []).map(mapTicket);
  },
  async getById(ticketId) {
    const { data } = await api.get<Record<string, any>>(`/tickets/${ticketId}`);
    return mapTicket(data);
  },
  async downloadDocument(ticketId) {
    const token = await TokenStorage.getAccessToken();
    const destination = `${FileSystem.cacheDirectory}ticket-${ticketId}.pdf`;
    const result = await FileSystem.downloadAsync(`${API_URL}/tickets/${ticketId}/pdf`, destination, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (result.status !== 200) {
      throw new Error('Could not download this ticket right now.');
    }
    return result.uri;
  },

  /**
   * Check-in is a distinct backend concept (`/checkins/scan`), which both
   * validates and consumes the ticket, and is restricted to organizers. It
   * signals outcomes with HTTP errors rather than a result field, so map those
   * back onto the scanner's result states.
   */
  async validate(input) {
    try {
      const { data } = await api.post<Record<string, any>>('/checkins/scan', {
        qrData: input.validationToken,
        eventId: input.eventId,
      });
      const ticket = data?.ticket ?? {};
      return {
        result: 'VALID',
        message: 'Ticket verified. Entry approved.',
        ticket: {
          ticketNumber: String(ticket.ticketCode ?? ''),
          holderName: String(ticket.attendeeName ?? ''),
          ticketTypeName: String(ticket.ticketType?.name ?? ''),
          eventTitle: String(ticket.order?.event?.title ?? ''),
          validatedAt: String(data?.checkedInAt ?? new Date().toISOString()),
        },
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? String((error.response?.data as { message?: string } | undefined)?.message ?? '')
        : '';
      const lowered = message.toLowerCase();

      if (lowered.includes('already')) {
        return { result: 'ALREADY_USED', message: 'This ticket has already been scanned.', ticket: null };
      }
      if (lowered.includes('different event') || lowered.includes('not for this event')) {
        return { result: 'WRONG_EVENT', message: 'This ticket is for a different event.', ticket: null };
      }
      if (lowered.includes('cancelled') || lowered.includes('refunded')) {
        return { result: 'REJECTED', message: 'This ticket is no longer valid for entry.', ticket: null };
      }
      if (axios.isAxiosError(error) && error.response) {
        return { result: 'INVALID', message: 'This QR code is not a recognised TicketFlow ticket.', ticket: null };
      }
      throw error; // Network/timeout — let the scanner show its retry state.
    }
  },
};

/** Generates one ticket per purchased unit — each attendee gets their own scannable QR. */
export function generateMockTicketsForOrder(order: Order): Ticket[] {
  const event = findMockEvent(order.eventId);
  const buyer = mockState.orderBuyers.get(order.id);
  if (!event || !buyer) return [];

  const newTickets: Ticket[] = [];
  order.items.forEach((item) => {
    const tier = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
    for (let i = 0; i < item.quantity; i++) {
      newTickets.push({
        id: randomId('ticket'),
        ticketNumber: `TFK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        event: {
          id: event.id,
          title: event.title,
          posterUrl: event.posterUrl,
          venue: event.venue,
          city: event.city,
          startsAt: event.startsAt,
        },
        ticketType: { id: item.ticketTypeId, name: item.ticketTypeName, price: tier?.price ?? item.unitPrice },
        holderName: buyer.name,
        holderEmail: buyer.email,
        qrToken: randomQrToken(),
        status: 'VALID',
        issuedAt: new Date().toISOString(),
        usedAt: null,
        pdfUrl: null,
      });
    }
  });

  mockState.tickets.push(...newTickets);
  return newTickets;
}

const mockTicketsService: TicketsService = {
  async listMine() {
    await delay(400);
    return mockState.tickets;
  },
  async getById(ticketId) {
    await delay(300);
    const ticket = mockState.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      const error = new Error('Ticket not found') as Error & { code: string };
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }
    return ticket;
  },
  async downloadDocument(ticketId) {
    await delay(500);
    const ticket = mockState.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const html = [
      'TICKETFLOW KENYA — DEMO TICKET RECEIPT',
      '(mock data — not a valid entry document)',
      '',
      `Event: ${ticket.event.title}`,
      `Date: ${formatEventDate(ticket.event.startsAt)}`,
      `Venue: ${ticket.event.venue}, ${ticket.event.city}`,
      `Ticket tier: ${ticket.ticketType.name} (${formatCurrency(ticket.ticketType.price)})`,
      `Holder: ${ticket.holderName}`,
      `Ticket number: ${ticket.ticketNumber}`,
      `QR token: ${ticket.qrToken}`,
    ].join('\n');

    const destination = `${FileSystem.cacheDirectory}ticket-${ticketId}.txt`;
    await FileSystem.writeAsStringAsync(destination, html, { encoding: 'utf8' });
    return destination;
  },
  async validate(input) {
    await delay(500);
    const ticket = mockState.tickets.find((t) => t.qrToken === input.validationToken);

    if (!ticket) {
      return { result: 'INVALID', message: 'This QR code is not a recognised TicketFlow ticket.', ticket: null };
    }
    if (ticket.event.id !== input.eventId) {
      return { result: 'WRONG_EVENT', message: 'This ticket is for a different event.', ticket: null };
    }
    if (ticket.status === 'USED') {
      return {
        result: 'ALREADY_USED',
        message: 'This ticket has already been scanned.',
        ticket: {
          ticketNumber: ticket.ticketNumber,
          holderName: ticket.holderName,
          ticketTypeName: ticket.ticketType.name,
          eventTitle: ticket.event.title,
          validatedAt: ticket.usedAt ?? new Date().toISOString(),
        },
      };
    }
    if (ticket.status !== 'VALID') {
      return { result: 'REJECTED', message: `This ticket is ${ticket.status.toLowerCase()} and cannot be used.`, ticket: null };
    }

    ticket.status = 'USED';
    ticket.usedAt = new Date().toISOString();
    return {
      result: 'VALID',
      message: 'Ticket verified. Entry approved.',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        holderName: ticket.holderName,
        ticketTypeName: ticket.ticketType.name,
        eventTitle: ticket.event.title,
        validatedAt: ticket.usedAt,
      },
    };
  },
};

export const ticketsService: TicketsService = USE_MOCK_DATA ? mockTicketsService : realTicketsService;
