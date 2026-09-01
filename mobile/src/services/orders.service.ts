import { USE_MOCK_DATA, PLATFORM_COMMISSION_RATE } from '@/constants/config';
import { findMockEvent } from '@/data/mock-events';
import { CreateOrderInput, Order } from '@/types/order';
import { roundCurrency } from '@/utils/currency';
import { api } from './api';
import { mapOrder } from './backend-mappers';
import { delay, mockState, randomId } from './mock-state';

interface OrdersService {
  create(input: CreateOrderInput): Promise<Order>;
  getById(orderId: string): Promise<Order>;
}

const realOrdersService: OrdersService = {
  async create(input) {
    // The API takes the buyer from the JWT, so only the cart and the M-Pesa
    // number are sent; it computes and returns the authoritative totals.
    const { data } = await api.post<Record<string, any>>('/orders', {
      eventId: input.eventId,
      items: input.items.map((item) => ({ ticketTypeId: item.ticketTypeId, quantity: item.quantity })),
      customerPhone: input.buyerPhone,
    });
    return mapOrder(data);
  },
  async getById(orderId) {
    const { data } = await api.get<Record<string, any>>(`/orders/${orderId}`);
    return mapOrder(data);
  },
};

function makeMockError(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

const mockOrdersService: OrdersService = {
  async create(input) {
    await delay(700);
    const event = findMockEvent(input.eventId);
    if (!event) throw makeMockError('Event not found', 'EVENT_NOT_FOUND');

    const items = input.items.map((item) => {
      const tier = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!tier) throw makeMockError('Ticket tier not found', 'EVENT_NOT_FOUND');
      if (item.quantity > tier.quantityRemaining) throw makeMockError('Not enough tickets remaining', 'TICKET_SOLD_OUT');
      return { ticketTypeId: tier.id, ticketTypeName: tier.name, unitPrice: tier.price, quantity: item.quantity };
    });

    // Reserve stock immediately, mirroring the real backend's transactional reservation.
    for (const item of items) {
      const tier = event.ticketTypes.find((t) => t.id === item.ticketTypeId)!;
      tier.quantityRemaining -= item.quantity;
    }

    const grossAmount = roundCurrency(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
    const platformFee = roundCurrency(grossAmount * PLATFORM_COMMISSION_RATE);
    const organizerNet = roundCurrency(grossAmount - platformFee);

    const order: Order = {
      id: randomId('order'),
      eventId: event.id,
      items,
      grossAmount,
      platformFee,
      organizerNet,
      // Mock mode follows the organizer-absorbed model: the buyer pays exactly
      // the ticket price and the 9% comes out of the organizer's share.
      totalPayable: grossAmount,
      currency: 'KES',
      status: 'AWAITING_PAYMENT',
      createdAt: new Date().toISOString(),
    };
    mockState.orders.set(order.id, order);
    mockState.orderBuyers.set(order.id, { name: input.buyerName, email: input.buyerEmail });
    return order;
  },
  async getById(orderId) {
    await delay(300);
    const order = mockState.orders.get(orderId);
    if (!order) throw makeMockError('Order not found', 'EVENT_NOT_FOUND');
    return order;
  },
};

export const ordersService: OrdersService = USE_MOCK_DATA ? mockOrdersService : realOrdersService;
