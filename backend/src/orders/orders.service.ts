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
    return parseFloat(this.configService.get<string>('PLATFORM_COMMISSION_PERCENT') || '7');
  }

  async create(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: dto.eventId } });
      if (!event) throw new NotFoundException('Event not found');
      if (!['PUBLISHED'].includes(event.status)) {
        throw new BadRequestException('This event is not currently selling tickets');
      }
      if (event.startDateTime < new Date()) {
        throw new BadRequestException('This event has already started or ended');
      }

      let totalAmount = 0;
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

        const unitPrice = Number(ticketType.price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

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

      const commissionPercent = this.getCommissionPercent();
      const platformFee = Math.round(totalAmount * (commissionPercent / 100) * 100) / 100;
      const organizerEarning = Math.round((totalAmount - platformFee) * 100) / 100;

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
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { quantitySold: { decrement: item.quantity } },
        });
      }
    });
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
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
  }

  async markFailed(orderId: string) {
    await this.releaseReservation(orderId);
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'FAILED' } });
  }
}
