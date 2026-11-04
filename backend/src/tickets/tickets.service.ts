import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import PDFDocument from 'pdfkit';

let ticketFlowLogo: Buffer | null | undefined;

/** Event times are shown in the event's own timezone (the server runs in UTC). */
function formatEventDateTime(value: Date | string, timeZone?: string | null) {
  const zone = timeZone || 'Africa/Nairobi';
  const formatted = new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'full', timeStyle: 'short', timeZone: zone,
  }).format(new Date(value));
  return zone === 'Africa/Nairobi' ? `${formatted} EAT` : formatted;
}

function loadTicketFlowLogo(): Buffer | null {
  if (ticketFlowLogo !== undefined) return ticketFlowLogo;
  try {
    ticketFlowLogo = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo.png'));
  } catch {
    ticketFlowLogo = null;
  }
  return ticketFlowLogo;
}

function drawTicketFlowLogo(doc: any, x: number, y: number) {
  const logo = loadTicketFlowLogo();
  if (logo) {
    doc.image(logo, x, y, { fit: [210, 80], align: 'left', valign: 'center' });
    return;
  }

  doc.save();
  doc.fillColor('#252a2f').font('Helvetica-Bold').fontSize(18).text('Ticket', x, y + 24, { continued: true });
  doc.fillColor('#e6002d').text('Flow');
  doc.fillColor('#252a2f').fontSize(6).text('K E N Y A', x + 34, y + 47);
  doc.restore();
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ── QR helpers ──────────────────────────────────────────────────────────────

  /**
   * QR signing key. TICKET_QR_SECRET should always be set; without it we
   * derive a key from JWT_SECRET rather than fall back to a constant anyone can
   * read in this repository. Tickets keep their stored signature, so changing
   * the key never invalidates tickets already issued (see verifyQrSignature).
   */
  private qrSecret(): string {
    const explicit = this.configService.get<string>('TICKET_QR_SECRET');
    if (explicit) return explicit;
    const jwt = this.configService.get<string>('JWT_SECRET');
    if (!this.warnedAboutQrSecret) {
      this.warnedAboutQrSecret = true;
      this.logger.warn('TICKET_QR_SECRET is not set — deriving the QR signing key from JWT_SECRET. Set a dedicated secret.');
    }
    if (jwt) return crypto.createHmac('sha256', jwt).update('ticketflow-qr-signing-v1').digest('hex');
    this.logger.error('Neither TICKET_QR_SECRET nor JWT_SECRET is set — QR signatures are not secure');
    return 'tfk-default-secret';
  }

  private warnedAboutQrSecret = false;

  private signQrPayload(ticketCode: string, eventId: string): string {
    const data = `${ticketCode}:${eventId}`;
    return crypto.createHmac('sha256', this.qrSecret()).update(data).digest('hex');
  }

  private buildQrPayload(ticketCode: string, eventId: string): string {
    const sig = this.signQrPayload(ticketCode, eventId);
    return JSON.stringify({ code: ticketCode, eid: eventId, sig });
  }

  /**
   * Checks a scanned signature in constant time. The ticket's own stored
   * signature is authoritative when present, so tickets signed under an older
   * key stay valid; otherwise the signature is recomputed with today's key.
   */
  verifyQrSignature(ticketCode: string, eventId: string, sig: string, storedSignature?: string | null): boolean {
    if (!sig || typeof sig !== 'string') return false;
    const expected = storedSignature || this.signQrPayload(ticketCode, eventId);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * Who may see a ticket: its holder, an admin, or the organizer running the
   * ticket's event. Before this, any organizer could open any ticket.
   */
  private async assertCanAccessTicket(ticket: { userId: string; order: { eventId: string } }, userId: string, role: string) {
    if (role === 'ADMIN' || ticket.userId === userId) return;
    if (role === 'ORGANIZER') {
      const event = await this.prisma.event.findUnique({
        where: { id: ticket.order.eventId },
        select: { organizer: { select: { userId: true } } },
      });
      if (event?.organizer.userId === userId) return;
    }
    throw new ForbiddenException('You do not have access to this ticket');
  }

  private generateTicketCode(): string {
    return `TFK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  }

  // ── PDF generation ───────────────────────────────────────────────────────────

  async generatePdfBuffer(ticketId: string): Promise<Buffer> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: true,
        order: { include: { event: true } },
        user: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.buildPdf(ticket);
  }

  async generatePdfBufferByCode(ticketCode: string): Promise<Buffer> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        ticketType: true,
        order: { include: { event: true } },
        user: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.buildPdf(ticket);
  }

  private buildPdf(ticket: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28; // A4 width in points
      const orange = '#e6002d'; // TicketFlow brand red
      const dark = '#111827';
      const muted = '#6b7280';
      const light = '#f9fafb';
      const border = '#e5e7eb';

      const event = ticket.order.event;
      const user = ticket.user;
      const buyerName = `${user.firstName} ${user.lastName}`;
      const formattedDate = formatEventDateTime(event.startDateTime, event.timezone);

      // ── Branded header ──────────────────────────────────────────────────────
      doc.rect(0, 0, W, 100).fill('#ffffff');
      doc.rect(0, 96, W, 4).fill(orange);

      drawTicketFlowLogo(doc, 30, 10);

      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold')
        .text('OFFICIAL E-TICKET', 345, 30, { width: 210, align: 'right' });
      doc.fillColor(muted).fontSize(8).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })}`, 345, 49, { width: 210, align: 'right' });

      // ── Event title strip ────────────────────────────────────────────────────
      doc.rect(0, 100, W, 52).fill(orange);
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
        .text(event.title, 40, 115, { width: W - 80, ellipsis: true });

      // ── Body ─────────────────────────────────────────────────────────────────
      let y = 172;
      const col1 = 40;
      const col2 = 200;
      const lineH = 28;

      const row = (label: string, value: string, bg?: string) => {
        if (bg) doc.rect(col1 - 8, y - 5, W - 64, lineH + 2).fill(bg);
        doc.fillColor(muted).fontSize(10).font('Helvetica').text(label, col1, y);
        doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text(value, col2, y, {
          width: W - col2 - 40,
        });
        y += lineH;
      };

      row('DATE & TIME', formattedDate);
      row('VENUE', `${event.venue}, ${event.city}`, light);
      row('HOLDER', buyerName);
      row('EMAIL', user.email, light);
      if (user.phone) row('PHONE', user.phone);

      // divider
      y += 8;
      doc.rect(col1 - 8, y, W - 64, 1).fill(border);
      y += 16;

      row('TICKET TYPE', `${ticket.ticketType.name} (${ticket.ticketType.category})`, light);
      row('PRICE', `KES ${Number(ticket.ticketType.price).toLocaleString('en-KE')}`);
      row('ORDER NO.', ticket.order.orderNumber, light);
      row('PAYMENT', 'CONFIRMED');

      // divider
      y += 8;
      doc.rect(col1 - 8, y, W - 64, 1).fill(border);
      y += 16;

      // Ticket code
      doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text('TICKET CODE', col1, y);
      y += 18;
      doc.rect(col1 - 8, y - 6, W - 64, 34).fill(dark);
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
        .text(ticket.ticketCode, col1, y + 2, { align: 'center', width: W - 80 });
      y += 46;

      // ── QR Code ──────────────────────────────────────────────────────────────
      const qrSize = 160;
      const qrX = (W - qrSize) / 2;

      // Extract base64 from data URL
      const qrBase64 = ticket.qrCodeData.replace(/^data:image\/png;base64,/, '');
      try {
        const qrBuf = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuf, qrX, y + 8, { width: qrSize, height: qrSize });
      } catch {
        doc.fillColor(muted).fontSize(10).text('QR code unavailable', qrX, y + 40, { width: qrSize, align: 'center' });
      }
      y += qrSize + 20;

      doc.fillColor(muted).fontSize(9).font('Helvetica')
        .text('Scan QR code at event entrance for verification', col1, y, { align: 'center', width: W - 80 });
      y += 20;

      // ── Footer ────────────────────────────────────────────────────────────────
      doc.rect(0, 770, W, 72).fill(light);
      doc.rect(0, 770, W, 1).fill(border);
      doc.fillColor(muted).fontSize(9).font('Helvetica')
        .text(
          'This ticket is valid for one entry only. Do not share your QR code. ' +
          'TicketFlow Kenya is not responsible for lost or stolen tickets.',
          40, 783, { width: W - 80, align: 'center' },
        );
      doc.fillColor(orange).fontSize(8)
        .text('support@ticketflow.co.ke  |  ticketflow.co.ke', 40, 808, {
          width: W - 80, align: 'center',
        });

      doc.end();
    });
  }

  // ── Core ticket generation ────────────────────────────────────────────────────

  /**
   * Called once a payment is confirmed. Creates one Ticket per unit purchased,
   * each with a signed QR code. Idempotent — safe to call from a retried callback.
   */
  async generateForOrder(orderId: string): Promise<any[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        event: true,
        user: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Issuance is only ever the consequence of a verified payment, which marks
    // the order PAID first. Refusing anything else here means no other code
    // path can mint tickets for an unpaid order, by mistake or otherwise.
    if (order.status !== 'PAID') {
      throw new BadRequestException(`Tickets can only be issued for a paid order (order is ${order.status})`);
    }

    // Build QR images outside the transaction — they are CPU work, not DB work.
    const planned: { ticketCode: string; qrCodeData: string; sig: string; ticketTypeId: string; attendeeName: string }[] = [];
    for (const item of order.items) {
      const attendeeList: any[] = Array.isArray(item.attendeesJson) ? (item.attendeesJson as any[]) : [];
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = this.generateTicketCode();
        const qrPayload = this.buildQrPayload(ticketCode, order.eventId);
        const sig = this.signQrPayload(ticketCode, order.eventId);
        const qrCodeData = await QRCode.toDataURL(qrPayload);
        const attendee = attendeeList[i] as { firstName: string; lastName: string } | undefined;
        const attendeeName = attendee
          ? `${attendee.firstName} ${attendee.lastName}`
          : `${order.user.firstName} ${order.user.lastName}`;
        planned.push({ ticketCode, qrCodeData, sig, ticketTypeId: item.ticketTypeId, attendeeName });
      }
    }

    // All-or-nothing, and serialised per order with a transaction-scoped
    // advisory lock: two concurrent callers cannot both pass the "already
    // issued?" check, and a crash mid-way cannot leave half an order issued.
    const { tickets: createdTickets, created } = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ticket-issue:' + orderId}))`;
      const existing = await tx.ticket.findMany({ where: { orderId } });
      if (existing.length > 0) return { tickets: existing, created: false };

      const rows: Awaited<ReturnType<typeof tx.ticket.create>>[] = [];
      for (const p of planned) {
        rows.push(
          await tx.ticket.create({
            data: {
              ticketCode: p.ticketCode,
              qrCodeData: p.qrCodeData,
              qrSignature: p.sig,
              orderId: order.id,
              ticketTypeId: p.ticketTypeId,
              userId: order.userId,
              attendeeName: p.attendeeName,
            },
          }),
        );
      }
      return { tickets: rows, created: true };
    });

    if (!created) return createdTickets;

    // Send email with PDF (non-blocking — failure must not prevent ticket
    // creation). Tickets whose email did not go out are retried by the
    // automation engine's ticket-delivery sweep.
    this.sendTicketEmailsAsync(orderId, createdTickets, order).catch((err) =>
      this.logger.error(`Email sending failed for order ${orderId}: ${err?.message}`),
    );

    this.logger.log(`Generated ${createdTickets.length} ticket(s) for order ${orderId}`);
    return createdTickets;
  }

  /**
   * Sends (or re-sends) one ticket's email. Throws when delivery fails so the
   * job queue can retry with backoff; returns false when email is not set up.
   * Idempotent: a ticket already emailed is skipped.
   */
  async deliverTicketEmail(ticketId: string, { force = false } = {}): Promise<boolean> {
    if (!this.emailService.isConfigured()) return false;
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: true, order: { include: { event: true } }, user: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.emailSentAt && !force) return true;
    if (ticket.order.status !== 'PAID' || ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') return false;

    const pdfBuffer = await this.buildPdf(ticket);
    const sent = await this.emailService.sendTicketEmail({
      to: ticket.user.email,
      buyerName: `${ticket.user.firstName} ${ticket.user.lastName}`,
      eventName: ticket.order.event.title,
      ticketType: `${ticket.ticketType.name} (${ticket.ticketType.category})`,
      ticketCode: ticket.ticketCode,
      venue: `${ticket.order.event.venue}, ${ticket.order.event.city}`,
      eventDateTime: formatEventDateTime(ticket.order.event.startDateTime, ticket.order.event.timezone),
      pdfBuffer,
    });
    if (!sent) throw new Error('Ticket email delivery failed');
    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { emailSentAt: new Date() } });
    return true;
  }

  private async sendTicketEmailsAsync(_orderId: string, tickets: any[], order: any) {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { id: { in: tickets.map((t) => t.ticketTypeId) } },
    });
    const ttMap = Object.fromEntries(ticketTypes.map((tt) => [tt.id, tt]));

    const eventDateTime = formatEventDateTime(order.event.startDateTime, order.event.timezone);

    for (const ticket of tickets) {
      try {
        const fullTicket = await this.prisma.ticket.findUnique({
          where: { id: ticket.id },
          include: { ticketType: true, order: { include: { event: true } }, user: true },
        });
        if (!fullTicket) continue;

        const pdfBuffer = await this.buildPdf(fullTicket);
        const tt = ttMap[ticket.ticketTypeId] || fullTicket.ticketType;

        const sent = await this.emailService.sendTicketEmail({
          to: order.user.email,
          buyerName: `${order.user.firstName} ${order.user.lastName}`,
          eventName: order.event.title,
          ticketType: `${tt.name} (${tt.category})`,
          ticketCode: ticket.ticketCode,
          venue: `${order.event.venue}, ${order.event.city}`,
          eventDateTime,
          pdfBuffer,
        });

        if (sent) {
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { emailSentAt: new Date() },
          });
        }
      } catch (err: any) {
        this.logger.error(`Email/PDF failed for ticket ${ticket.ticketCode}: ${err?.message}`);
      }
    }
  }

  // ── Verification endpoint ──────────────────────────────────────────────────

  async verifyTicket(ticketCode: string): Promise<{
    status: 'VALID' | 'USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'PAYMENT_NOT_CONFIRMED';
    message: string;
    ticket?: Record<string, unknown>;
  }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        ticketType: true,
        order: { include: { event: true } },
        user: true,
        checkIn: true,
      },
    });

    if (!ticket) {
      return { status: 'INVALID', message: 'INVALID TICKET — ticket code not found' };
    }

    if (ticket.order.status !== 'PAID') {
      return {
        status: 'PAYMENT_NOT_CONFIRMED',
        message: 'PAYMENT NOT CONFIRMED — this ticket cannot be used until payment is complete',
      };
    }

    if (ticket.status === 'CANCELLED') {
      return { status: 'CANCELLED', message: 'TICKET CANCELLED — this ticket has been voided' };
    }

    if (ticket.status === 'REFUNDED') {
      return { status: 'REFUNDED', message: 'TICKET REFUNDED — this ticket is no longer valid' };
    }

    if (ticket.status === 'USED' || ticket.checkIn) {
      return {
        status: 'USED',
        message: `TICKET ALREADY USED — scanned on ${
          ticket.checkIn?.checkedInAt
            ? new Date(ticket.checkIn.checkedInAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
            : 'unknown date'
        }`,
        ticket: {
          ticketCode: ticket.ticketCode,
          eventTitle: ticket.order.event.title,
          holderName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          ticketType: ticket.ticketType.name,
          category: ticket.ticketType.category,
          scannedAt: ticket.checkIn?.checkedInAt ?? ticket.scannedAt,
        },
      };
    }

    return {
      status: 'VALID',
      message: 'VALID TICKET — ENTRY ALLOWED',
      ticket: {
        ticketCode: ticket.ticketCode,
        eventTitle: ticket.order.event.title,
        eventVenue: `${ticket.order.event.venue}, ${ticket.order.event.city}`,
        eventDateTime: ticket.order.event.startDateTime,
        holderName: `${ticket.user.firstName} ${ticket.user.lastName}`,
        ticketType: ticket.ticketType.name,
        category: ticket.ticketType.category,
        paymentStatus: ticket.order.status,
        status: ticket.status,
      },
    };
  }

  // ── Standard finders ──────────────────────────────────────────────────────

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
    await this.assertCanAccessTicket(ticket, userId, role);
    return ticket;
  }

  async findByCode(userId: string, role: string, code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: {
        ticketType: true,
        // Never the whole user row — that carried the buyer's password hash.
        order: { include: { event: true, user: { select: { id: true, firstName: true, lastName: true } } } },
        checkIn: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertCanAccessTicket(ticket, userId, role);
    return ticket;
  }

  async streamPdf(userId: string, role: string, id: string): Promise<StreamableFile> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertCanAccessTicket(ticket, userId, role);
    const buf = await this.generatePdfBuffer(id);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `attachment; filename="ticket-${ticket.ticketCode}.pdf"`,
    });
  }
}
