import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private generateOrderNumber() {
    return `TFK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  private getCommissionPercent() {
    return parseFloat(this.configService.get<string>('PLATFORM_COMMISSION_PERCENT') || '9');
  }

  async create(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: dto.eventId },
        include: { organizer: { select: { isVerified: true } } },
      });
      if (!event) throw new NotFoundException('Event not found');
      if (!['PUBLISHED'].includes(event.status)) {
        throw new BadRequestException('This event is not currently selling tickets');
      }
      if (event.startDateTime < new Date()) {
        throw new BadRequestException('This event has already started or ended');
      }

      if (event.bookingMode === 'EXTERNAL') {
        throw new BadRequestException(
          'This event is sold by an external authorised ticket provider.',
        );
      }

      // Payment safety: a listing may be visible without being authorised to
      // collect money. `salesEnabled` is off for demo listings and for real
      // events whose organizer has not been onboarded, and an unverified
      // organizer can never sell. Checked here — not only in the UI — because
      // this endpoint is reachable directly.
      if (!event.salesEnabled) {
        throw new BadRequestException(
          'Tickets for this event are not on sale through TicketFlow Kenya.',
        );
      }
      if (!event.organizer?.isVerified) {
        throw new BadRequestException(
          "This event's organizer has not completed verification, so tickets cannot be sold yet.",
        );
      }

      // Demo listings are TicketFlow's own sample events. They stay bookable
      // against the Daraja sandbox and the mock endpoint so the whole purchase
      // flow can be exercised, but they must never reach a real customer's
      // money: with production Daraja credentials configured, they are refused.
      if (event.isDemo && this.configService.get<string>('MPESA_ENV') === 'production') {
        throw new BadRequestException(
          'This is a sample listing and cannot be purchased.',
        );
      }

      let ticketSubtotal = 0;
      const itemsData: { ticketTypeId: string; quantity: number; unitPrice: number; subtotal: number; attendeesJson?: any }[] = [];

      for (const item of dto.items) {
        const ticketType = await tx.ticketType.findUnique({ where: { id: item.ticketTypeId } });
        if (!ticketType || ticketType.eventId !== event.id) {
          throw new NotFoundException(`Ticket type ${item.ticketTypeId} not found for this event`);
        }
        const available = ticketType.quantity - ticketType.quantitySold;
        if (available < item.quantity) {
          throw new BadRequestException(`Not enough tickets available for "${ticketType.name}"`);
        }

        // A tier can open late (early-bird release) or close before the event
        // (student pricing that ends a week out). Outside its window it is not
        // purchasable even though the event itself is on sale.
        const now = new Date();
        if (ticketType.salesStart && ticketType.salesStart > now) {
          throw new BadRequestException(`"${ticketType.name}" is not on sale yet`);
        }
        if (ticketType.salesEnd && ticketType.salesEnd < now) {
          throw new BadRequestException(`Sales for "${ticketType.name}" have closed`);
        }

        const unitPrice = Number(ticketType.price);
        const subtotal = unitPrice * item.quantity;
        ticketSubtotal += subtotal;

        itemsData.push({
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          ...(item.attendees?.length ? { attendeesJson: item.attendees } : {}),
        });

        // Reserve the tickets immediately so concurrent buyers cannot oversell.
        // Reservation is released if payment fails or is cancelled.
        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: { quantitySold: { increment: item.quantity } },
        });
      }

      // Service-fee model: the platform fee is charged to the buyer on top of the
      // ticket price, so the organizer earns the full ticket subtotal.
      const commissionPercent = this.getCommissionPercent();
      const platformFee = Math.round(ticketSubtotal * (commissionPercent / 100) * 100) / 100;
      const totalAmount = Math.round((ticketSubtotal + platformFee) * 100) / 100;
      const organizerEarning = Math.round(ticketSubtotal * 100) / 100;

      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          eventId: event.id,
          totalAmount,
          platformFee,
          organizerEarning,
          customerPhone: dto.customerPhone,
          items: {
            create: itemsData,
          },
        },
        include: { items: { include: { ticketType: true } }, event: true },
      });

      return order;
    });
  }

  async releaseReservation(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // GREATEST(0, ...) rather than a plain decrement: a counter that goes
        // negative would silently oversell the tier for the rest of its life.
        await tx.$executeRaw`UPDATE "ticket_types" SET "quantitySold" = GREATEST(0, "quantitySold" - ${item.quantity}) WHERE "id" = ${item.ticketTypeId}`;
      }
    });
  }

  /**
   * Takes (or re-takes) the stock for an order's items.
   *
   * `allowOversell` is only ever set for a payment that has already succeeded —
   * the customer's money has left their account, so the ticket is owed to them
   * even if the tier filled up while the payment was in flight. Every other
   * caller must fail loudly when the stock is gone.
   */
  private async reserveItems(orderId: string, { allowOversell }: { allowOversell: boolean }) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');

      for (const item of order.items) {
        const ticketType = await tx.ticketType.findUnique({ where: { id: item.ticketTypeId } });
        if (!ticketType) throw new NotFoundException('A ticket type on this order no longer exists');

        const available = ticketType.quantity - ticketType.quantitySold;
        if (!allowOversell && available < item.quantity) {
          throw new BadRequestException(`"${ticketType.name}" has sold out since this order was created`);
        }

        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: { quantitySold: { increment: item.quantity } },
        });
      }
    });
  }

  /**
   * Puts a failed / cancelled / expired order back on the table so the buyer can
   * request a fresh STK push. The reservation was released when the payment did
   * not complete, so it has to be taken again — and the tier may have sold out
   * in the meantime, which is a real failure the buyer has to be told about.
   */
  async reopenForRetry(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'PENDING') return order; // reservation still held
    if (order.status === 'PAID') throw new BadRequestException('This order has already been paid for');
    if (order.status === 'CANCELLED') throw new BadRequestException('This order was cancelled');

    if (order.event.startDateTime < new Date()) {
      throw new BadRequestException('This event has already started, so it can no longer be paid for');
    }
    if (order.event.status !== 'PUBLISHED' || !order.event.salesEnabled) {
      throw new BadRequestException('Tickets for this event are no longer on sale');
    }

    await this.reserveItems(orderId, { allowOversell: false });
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'PENDING' } });
  }

  async findMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { ticketType: true } }, event: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, role: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { ticketType: true } }, event: true, payments: true, tickets: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  async markPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'PAID') return order;

    // A late success — a Safaricom callback landing after we had already timed
    // the request out — still has to be honoured: the money has left the
    // customer's account. The reservation was released when the order was
    // failed, so take it back before marking it paid.
    if (order.status !== 'PENDING') {
      await this.reserveItems(orderId, { allowOversell: true });
    }

    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
  }

  async markFailed(orderId: string) {
    // Claim the transition atomically. A Safaricom callback and the
    // reconciliation sweep can both report the same failure, and releasing the
    // reservation twice would hand the tier back stock it never sold.
    const claimed = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    if (claimed.count === 0) {
      return this.prisma.order.findUnique({ where: { id: orderId } });
    }

    await this.releaseReservation(orderId);
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }
}
