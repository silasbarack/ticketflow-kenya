import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ManualCheckinDto } from './dto/manual-checkin.dto';

@Injectable()
export class CheckinsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private async assertOrganizerOwnsEvent(eventId: string, organizerUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { organizer: true } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizer.userId !== organizerUserId) {
      throw new ForbiddenException('You do not manage this event');
    }
    return event;
  }

  private async performCheckIn(ticketCode: string, eventId: string, scannedByUserId: string, method: 'QR' | 'MANUAL') {
    await this.assertOrganizerOwnsEvent(eventId, scannedByUserId);

    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: { order: true, checkIn: true, ticketType: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.order.eventId !== eventId) {
      throw new BadRequestException('This ticket does not belong to this event');
    }
    if (ticket.status === 'USED' || ticket.checkIn) {
      throw new BadRequestException(`Ticket already checked in at ${ticket.checkIn?.checkedInAt.toISOString()}`);
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      throw new BadRequestException(`Ticket is ${ticket.status.toLowerCase()} and cannot be checked in`);
    }

    const now = new Date();
    const checkIn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.checkIn.create({
        data: { ticketId: ticket.id, eventId, scannedById: scannedByUserId, method },
      });
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED', scannedAt: now },
      });
      return created;
    });

    await this.auditLogsService.log({
      actorId: scannedByUserId,
      action: 'TICKET_CHECKED_IN',
      entityType: 'Ticket',
      entityId: ticket.id,
      metadata: { method, eventId },
    });

    return { checkIn, ticket: { ...ticket, status: 'USED' } };
  }

  async scan(scannedByUserId: string, dto: ScanTicketDto) {
    let parsed: { code?: string; eid?: string; sig?: string };
    try {
      parsed = JSON.parse(dto.qrData);
    } catch {
      throw new BadRequestException('Invalid QR code data');
    }
    const ticketCode = parsed.code;
    if (!ticketCode) {
      throw new BadRequestException('QR code does not contain a valid ticket code');
    }
    return this.performCheckIn(ticketCode, dto.eventId, scannedByUserId, 'QR');
  }

  async manual(scannedByUserId: string, dto: ManualCheckinDto) {
    return this.performCheckIn(dto.ticketCode, dto.eventId, scannedByUserId, 'MANUAL');
  }

  async findAllForEvent(organizerUserId: string, eventId: string) {
    await this.assertOrganizerOwnsEvent(eventId, organizerUserId);
    return this.prisma.checkIn.findMany({
      where: { eventId },
      include: { ticket: { include: { ticketType: true, order: { include: { user: true } } } }, scannedBy: true },
      orderBy: { checkedInAt: 'desc' },
    });
  }
}
