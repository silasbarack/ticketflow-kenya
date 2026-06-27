import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  private generateTicketCode() {
    return `TFK-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  /**
   * Called once a payment is confirmed successful. Creates one Ticket row
   * (with its own QR code) per unit purchased across all order items.
   */
  async generateForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.ticket.findMany({ where: { orderId } });
    if (existing.length > 0) return existing; // idempotent: avoid double-generation on retried callbacks

    const createdTickets: Awaited<ReturnType<typeof this.prisma.ticket.create>>[] = [];
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = this.generateTicketCode();
        const qrPayload = JSON.stringify({ code: ticketCode, orderId: order.id });
        const qrCodeData = await QRCode.toDataURL(qrPayload);

        const ticket = await this.prisma.ticket.create({
          data: {
            ticketCode,
            qrCodeData,
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            userId: order.userId,
          },
        });
        createdTickets.push(ticket);
      }
    }
    return createdTickets;
  }

  async findMine(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        ticketType: true,
        order: { include: { event: true } },
        checkIn: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, role: string, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { ticketType: true, order: { include: { event: true } }, checkIn: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (role !== 'ADMIN' && role !== 'ORGANIZER' && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    return ticket;
  }

  async findByCode(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: { ticketType: true, order: { include: { event: true, user: true } }, checkIn: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
