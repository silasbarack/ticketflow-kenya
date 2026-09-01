import { User } from '@/types/auth';
import { EventItem, EventStatus, TicketAvailabilityStatus, TicketType } from '@/types/event';
import { Order, OrderStatus } from '@/types/order';
import { PaymentStatus } from '@/types/payment';
import { Ticket, TicketStatus } from '@/types/ticket';

/**
 * Translation layer between the NestJS/Prisma API and this app's domain models.
 *
 * The backend predates the mobile app and uses different field names
 * (`firstName`/`lastName`, `startDateTime`, `quantity`/`quantitySold`) and
 * slightly different enums (`SUCCESS` vs `PAID`, `ACTIVE` vs `VALID`).
 * Rather than reshape the API — which the web app also depends on — every
 * real service maps through here, so screens only ever see our own types.
 *
 * All fields are read defensively: a shape change upstream should degrade to
 * a sensible default, not crash a screen.
 */

type Raw = Record<string, any>;

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

function iso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

export function mapUser(raw: Raw): User {
  const name = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim();
  return {
    id: String(raw.id ?? ''),
    name: name || String(raw.email ?? 'TicketFlow user'),
    email: String(raw.email ?? ''),
    phoneNumber: String(raw.phone ?? ''),
    role: raw.role === 'ORGANIZER' || raw.role === 'ADMIN' || raw.role === 'SCANNER' ? raw.role : 'CUSTOMER',
    // The backend has no email-verification concept yet, so accounts are
    // treated as verified rather than showing a warning users can't clear.
    emailVerified: true,
    createdAt: iso(raw.createdAt),
  };
}

export function mapTicketType(raw: Raw, eventId: string): TicketType {
  const quantityAvailable = num(raw.quantity);
  const quantitySold = num(raw.quantitySold);
  const rawAvailability = String(raw.availabilityStatus ?? '');
  const availabilityStatus: TicketAvailabilityStatus =
    rawAvailability === 'AVAILABLE' ||
    rawAvailability === 'SOLD_OUT' ||
    rawAvailability === 'CLOSED' ||
    rawAvailability === 'NOT_YET_ON_SALE'
      ? rawAvailability
      : quantityAvailable - quantitySold > 0
        ? 'AVAILABLE'
        : 'SOLD_OUT';
  return {
    id: String(raw.id ?? ''),
    eventId,
    name: String(raw.name ?? 'Ticket'),
    description: raw.description ?? null,
    price: num(raw.price),
    quantityAvailable,
    quantityRemaining: Math.max(0, quantityAvailable - quantitySold),
    salesStart: raw.salesStart ?? null,
    salesEnd: raw.salesEnd ?? null,
    availabilityStatus,
  };
}

export function mapEvent(raw: Raw): EventItem {
  const id = String(raw.id ?? '');
  const description = String(raw.description ?? '');
  const rawStatus = String(raw.status ?? 'PUBLISHED');
  const status: EventStatus =
    rawStatus === 'DRAFT' ||
    rawStatus === 'PUBLISHED' ||
    rawStatus === 'SOLD_OUT' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'COMPLETED'
      ? rawStatus
      : 'PUBLISHED';
  return {
    id,
    title: String(raw.title ?? 'Untitled event'),
    slug: String(raw.slug ?? id),
    description,
    shortDescription: description.length > 140 ? `${description.slice(0, 137)}…` : description,
    posterUrl: String(raw.posterUrl ?? ''),
    venue: String(raw.venue ?? ''),
    city: String(raw.city ?? ''),
    startsAt: iso(raw.startDateTime),
    endsAt: iso(raw.endDateTime ?? raw.startDateTime),
    organizerName: String(raw.organizerName ?? raw.organizer?.companyName ?? 'TicketFlow Kenya'),
    bookingMode: raw.bookingMode === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
    bookingUrl: typeof raw.bookingUrl === 'string' ? raw.bookingUrl : null,
    verificationSource: typeof raw.verificationSource === 'string' ? raw.verificationSource : null,
    verificationSourceUrl:
      typeof raw.verificationSourceUrl === 'string' ? raw.verificationSourceUrl : null,
    category: String(raw.category?.name ?? 'Events'),
    status,
    featured: Boolean(raw.isFeatured),
    ticketTypes: Array.isArray(raw.ticketTypes) ? raw.ticketTypes.map((t: Raw) => mapTicketType(t, id)) : [],
  };
}

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

export function mapOrder(raw: Raw): Order {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id ?? ''),
    eventId: String(raw.eventId ?? ''),
    items: items.map((item: Raw) => ({
      ticketTypeId: String(item.ticketTypeId ?? ''),
      ticketTypeName: String(item.ticketType?.name ?? item.ticketTypeName ?? 'Ticket'),
      unitPrice: num(item.unitPrice ?? item.price),
      quantity: num(item.quantity, 1),
    })),
    // The live backend bills the platform fee ON TOP of the ticket value:
    // `organizerEarning` is the full ticket subtotal, `platformFee` is the
    // buyer-paid service fee, and `totalAmount` is what actually gets charged.
    grossAmount: num(raw.organizerEarning),
    platformFee: num(raw.platformFee),
    organizerNet: num(raw.organizerEarning),
    totalPayable: num(raw.totalAmount),
    currency: 'KES',
    status: ORDER_STATUS_MAP[String(raw.status)] ?? 'PENDING',
    createdAt: iso(raw.createdAt),
  };
}

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: 'PENDING',
  SUCCESS: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

export function mapPaymentStatus(rawStatus: unknown): PaymentStatus {
  return PAYMENT_STATUS_MAP[String(rawStatus)] ?? 'PENDING';
}

const TICKET_STATUS_MAP: Record<string, TicketStatus> = {
  ACTIVE: 'VALID',
  USED: 'USED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

export function mapTicket(raw: Raw): Ticket {
  const event = raw.order?.event ?? raw.event ?? {};
  const ticketType = raw.ticketType ?? {};
  const user = raw.user ?? {};
  const holderName =
    raw.attendeeName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Ticket holder';

  return {
    id: String(raw.id ?? ''),
    ticketNumber: String(raw.ticketCode ?? ''),
    event: {
      id: String(event.id ?? raw.order?.eventId ?? ''),
      title: String(event.title ?? 'Event'),
      posterUrl: String(event.posterUrl ?? ''),
      venue: String(event.venue ?? ''),
      city: String(event.city ?? ''),
      startsAt: iso(event.startDateTime),
    },
    ticketType: {
      id: String(ticketType.id ?? raw.ticketTypeId ?? ''),
      name: String(ticketType.name ?? 'Ticket'),
      price: num(ticketType.price),
    },
    holderName,
    holderEmail: String(user.email ?? ''),
    // Server-issued QR. The backend stores an already-rendered PNG data URL;
    // the ticket screen renders it directly rather than re-encoding it.
    qrToken: String(raw.qrCodeData ?? raw.ticketCode ?? ''),
    status: TICKET_STATUS_MAP[String(raw.status)] ?? 'VALID',
    issuedAt: iso(raw.createdAt),
    usedAt: raw.scannedAt ?? raw.checkIn?.checkedInAt ?? null,
    pdfUrl: null,
  };
}
