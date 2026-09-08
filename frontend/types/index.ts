export type UserRole = 'CUSTOMER' | 'ORGANIZER' | 'ADMIN';

export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export type EventBookingMode = 'INTERNAL' | 'EXTERNAL';

export type TicketAvailabilityStatus = 'AVAILABLE' | 'SOLD_OUT' | 'CLOSED' | 'NOT_YET_ON_SALE';

export type TicketTypeCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'STUDENT' | 'EARLY_BIRD';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  organizerProfile?: OrganizerProfile | null;
}

export interface OrganizerProfile {
  id: string;
  userId: string;
  companyName: string;
  description?: string | null;
  phone?: string | null;
  isVerified: boolean;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  category: TicketTypeCategory;
  price: string | number;
  quantity: number;
  quantitySold: number;
  /** Seller-published state; essential for external listings with no TicketFlow inventory. */
  availabilityStatus?: TicketAvailabilityStatus;
  description?: string | null;
  /** Optional sales window — a tier outside it cannot be bought. */
  salesStart?: string | null;
  salesEnd?: string | null;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  posterUrl?: string | null;
  posterAlt?: string | null;
  venue: string;
  city: string;
  county?: string | null;
  address?: string | null;
  organizerName?: string | null;
  startDateTime: string;
  endDateTime: string;
  timezone?: string;
  status: EventStatus;
  rejectionReason?: string | null;
  isFeatured?: boolean;
  bookingMode?: EventBookingMode;
  bookingUrl?: string | null;
  verificationSource?: string | null;
  verificationSourceUrl?: string | null;
  secondaryVerificationSourceUrl?: string | null;
  verifiedAt?: string | null;
  posterSourceUrl?: string | null;
  /** False for listings that are visible but not authorised to take money. */
  salesEnabled?: boolean;
  /** True for TicketFlow's own sample listings. */
  isDemo?: boolean;
  /**
   * Computed server-side by `isEventBookable` and attached to public event
   * payloads: published, sales on, organizer verified, and not yet started.
   * The API re-checks the same conditions on order creation, so this is only
   * ever a hint for rendering.
   */
  isBookable?: boolean;
  category: EventCategory;
  ticketTypes: TicketType[];
  organizer?: { companyName: string; description?: string | null; isVerified?: boolean };
  /** Present on API responses (Prisma default scalar) even though it wasn't previously declared here. */
  createdAt?: string;
}

export interface OrderItem {
  id: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  ticketType: TicketType;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string | number;
  platformFee: string | number;
  organizerEarning: string | number;
  customerPhone?: string | null;
  createdAt: string;
  items: OrderItem[];
  event: EventItem;
  payments?: Payment[];
  tickets?: Ticket[];
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  status: PaymentStatus;
  amount: string | number;
  phone?: string | null;
  checkoutRequestId?: string | null;
  mpesaReceiptNumber?: string | null;
  resultDesc?: string | null;
  createdAt: string;
}

/**
 * What the buyer is waiting on. `status` alone cannot express this — PENDING
 * spans everything from "still talking to Daraja" to "PIN entered, result in
 * flight". Mirrors backend/src/payments/payment-status.ts.
 */
export type PaymentStage =
  | 'INITIATED'
  | 'AWAITING_CUSTOMER'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED';

/** Response of GET /payments/:id/status — the payment-processing screen polls this. */
export interface PaymentStatusView {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  status: PaymentStatus;
  stage: PaymentStage;
  isFinal: boolean;
  amount: number;
  /** Masked for display, e.g. "0712 *** 678". Never the full number. */
  phoneMasked: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  mpesaReceiptNumber: string | null;
  resultCode: string | null;
  resultDesc: string | null;
  message: string;
  expiresAt: string | null;
  ticketsIssued: number;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketCode: string;
  qrCodeData: string;
  status: TicketStatus;
  attendeeName?: string | null;
  createdAt: string;
  ticketType: TicketType;
  order: Order;
  checkIn?: CheckIn | null;
}

export interface CheckIn {
  id: string;
  ticketId: string;
  eventId: string;
  method: string;
  checkedInAt: string;
}

export interface Attendee {
  ticketCode: string;
  attendeeName: string;
  email: string;
  phone?: string | null;
  ticketType: string;
  category: TicketTypeCategory;
  status: TicketStatus;
  checkedInAt: string | null;
  purchasedAt: string;
}

export interface AttendeeInfo {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  phone: string;
}

export interface CartItem {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventDateTime: string;
  eventVenue: string;
  eventCity: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketTypeCategory: TicketTypeCategory;
  price: number;
  quantity: number;
}

export interface AdminStats {
  totalUsers: number;
  totalOrganizers: number;
  totalCustomers: number;
  totalEvents: number;
  publishedEvents: number;
  pendingEvents: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  ticketsSold: number;
  ticketsCheckedIn: number;
}

export interface OrganizerDashboardStats {
  totalEvents: number;
  publishedEvents: number;
  pendingEvents: number;
  ticketsSold: number;
  totalRevenue: number;
  totalOrganizerEarning: number;
  totalOrders: number;
}
