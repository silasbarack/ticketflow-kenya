import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ManualCheckinDto } from './dto/manual-checkin.dto';

@Injectable()
export class CheckinsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
    private ticketsService: TicketsService,
  ) {}

  /**
   * A second scan of a used ticket is the main signal for screenshot sharing
   * and resale. It is recorded (no personal data) for the risk monitor; it
   * never blocks or cancels anything by itself.
   */
  private async recordRejectedScan(ticketId: string, eventId: string, scannedByUserId: string, reason: string) {
    await this.auditLogsService
      .log({
        actorId: scannedByUserId,
        action: reason === 'ALREADY_USED' ? 'TICKET_DUPLICATE_SCAN' : 'TICKET_SCAN_REJECTED',
        entityType: 'Ticket',
        entityId: ticketId,
        metadata: { eventId, reason },
      })
      .catch(() => undefined);
  }

  private async assertOrganizerOwnsEvent(eventId: string, organizerUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { organizer: true } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizer.userId !== organizerUserId) {
      throw new ForbiddenException('You do not manage this event');
    }
    return event;
  }

  private async performCheckIn(
    ticketCode: string,
    eventId: string,
    scannedByUserId: string,
    method: 'QR' | 'MANUAL',
    qrSignature?: string,
  ) {
    await this.assertOrganizerOwnsEvent(eventId, scannedByUserId);

    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: { order: true, checkIn: true, ticketType: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.order.eventId !== eventId) {
      await this.recordRejectedScan(ticket.id, eventId, scannedByUserId, 'WRONG_EVENT');
      throw new BadRequestException('This ticket does not belong to this event');
    }
    // A QR scan must carry a valid signature. Without this check, anyone who
    // learned a ticket code could print their own QR for it.
    if (method === 'QR' && !this.ticketsService.verifyQrSignature(ticket.ticketCode, eventId, qrSignature ?? '', ticket.qrSignature)) {
      await this.recordRejectedScan(ticket.id, eventId, scannedByUserId, 'BAD_SIGNATURE');
      throw new BadRequestException('This QR code failed verification. It may be altered or counterfeit.');
    }
    if (ticket.order.status !== 'PAID') {
      await this.recordRejectedScan(ticket.id, eventId, scannedByUserId, 'UNPAID');
      throw new BadRequestException('Payment for this ticket has not been confirmed');
    }
    if (ticket.status === 'USED' || ticket.checkIn) {
      await this.recordRejectedScan(ticket.id, eventId, scannedByUserId, 'ALREADY_USED');
      throw new BadRequestException(`Ticket already checked in at ${ticket.checkIn?.checkedInAt.toISOString()}`);
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      throw new BadRequestException(`Ticket is ${ticket.status.toLowerCase()} and cannot be checked in`);
    }

    const now = new Date();
    let checkIn;
    try {
      checkIn = await this.prisma.$transaction(async (tx) => {
        // Conditional on the ticket still being ACTIVE, so two gates scanning
        // the same ticket at the same instant cannot both admit it.
        const claimed = await tx.ticket.updateMany({
          where: { id: ticket.id, status: 'ACTIVE' },
          data: { status: 'USED', scannedAt: now },
        });
        if (claimed.count === 0) throw new BadRequestException('Ticket already checked in');
        return tx.checkIn.create({
          data: { ticketId: ticket.id, eventId, scannedById: scannedByUserId, method },
        });
      });
    } catch (error) {
      const duplicate =
        error instanceof BadRequestException ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
      if (!duplicate) throw error;
      await this.recordRejectedScan(ticket.id, eventId, scannedByUserId, 'ALREADY_USED');
      throw new BadRequestException('Ticket already checked in');
    }

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
    return this.performCheckIn(ticketCode, dto.eventId, scannedByUserId, 'QR', parsed.sig);
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
