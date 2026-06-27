export type UserRole = 'CUSTOMER' | 'ORGANIZER' | 'ADMIN';

export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export type TicketTypeCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'STUDENT' | 'EARLY_BIRD';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

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
  description?: string | null;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  posterUrl?: string | null;
  venue: string;
  city: string;
  address?: string | null;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  rejectionReason?: string | null;
  category: EventCategory;
  ticketTypes: TicketType[];
  organizer?: { companyName: string; description?: string | null };
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
