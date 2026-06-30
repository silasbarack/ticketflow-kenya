import {
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

// Cached logo PNG buffer (Kenya map + card design)
let _logoBuf: Buffer | null = null;
function getLogoBuf(): Buffer | null {
  if (_logoBuf) return _logoBuf;
  try {
    _logoBuf = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo.png'));
  } catch { /* logo not found */ }
  return _logoBuf;
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

  private signQrPayload(ticketCode: string, eventId: string): string {
    const secret = this.configService.get<string>('TICKET_QR_SECRET') || 'tfk-default-secret';
    const data = `${ticketCode}:${eventId}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  private buildQrPayload(ticketCode: string, eventId: string): string {
    const sig = this.signQrPayload(ticketCode, eventId);
    return JSON.stringify({ code: ticketCode, eid: eventId, sig });
  }

  verifyQrSignature(ticketCode: string, eventId: string, sig: string): boolean {
    return this.signQrPayload(ticketCode, eventId) === sig;
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
      const orange = '#be123c'; // Kenya flag red
      const dark = '#111827';
      const muted = '#6b7280';
      const light = '#f9fafb';
      const border = '#e5e7eb';

      const event = ticket.order.event;
      const user = ticket.user;
      const buyerName = `${user.firstName} ${user.lastName}`;
      const formattedDate = new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'full', timeStyle: 'short',
      }).format(new Date(event.startDateTime));

      // ── Header band ─────────────────────────────────────────────────────────
      doc.rect(0, 0, W, 100).fill(orange);

      // Kenya map + card logo PNG
      const logoBuf = getLogoBuf();
      const logoH = 78; // height in PDF points
      const logoW = Math.round(logoH * (480 / 500)); // preserve aspect ratio
      if (logoBuf) {
        doc.image(logoBuf, 30, 11, { height: logoH });
      }

      // "TicketFlow Kenya" text beside the logo
      const textX = logoBuf ? 30 + logoW + 10 : 40;
      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
        .text('TICKETFLOW', textX, 26, { width: W - textX - 20 });
      doc.fillColor('#fda4af').fontSize(12).font('Helvetica-Bold')
        .text('KENYA', textX, 55, { characterSpacing: 4 });
      doc.fillColor('#fecdd3').fontSize(9).font('Helvetica')
        .text('Official E-Ticket', textX, 72);
      doc.fillColor('#ffffff').fontSize(8)
        .text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, textX, 84);

      // ── Event title strip ────────────────────────────────────────────────────
      doc.rect(0, 100, W, 52).fill(dark);
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
      row('PAYMENT', 'CONFIRMED ✓');

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

    // Idempotency guard
    const existing = await this.prisma.ticket.findMany({ where: { orderId } });
    if (existing.length > 0) return existing;

    const createdTickets: Awaited<ReturnType<typeof this.prisma.ticket.create>>[] = [];

    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = this.generateTicketCode();
        const qrPayload = this.buildQrPayload(ticketCode, order.eventId);
        const sig = this.signQrPayload(ticketCode, order.eventId);
        const qrCodeData = await QRCode.toDataURL(qrPayload);

        const ticket = await this.prisma.ticket.create({
          data: {
            ticketCode,
            qrCodeData,
            qrSignature: sig,
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            userId: order.userId,
            attendeeName: `${order.user.firstName} ${order.user.lastName}`,
          },
        });
        createdTickets.push(ticket);
      }
    }

    // Send email with PDF (non-blocking — failure must not prevent ticket creation)
    this.sendTicketEmailsAsync(orderId, createdTickets, order).catch((err) =>
      this.logger.error(`Email sending failed for order ${orderId}: ${err?.message}`),
    );

    this.logger.log(`Generated ${createdTickets.length} ticket(s) for order ${orderId}`);
    return createdTickets;
  }

  private async sendTicketEmailsAsync(_orderId: string, tickets: any[], order: any) {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { id: { in: tickets.map((t) => t.ticketTypeId) } },
    });
    const ttMap = Object.fromEntries(ticketTypes.map((tt) => [tt.id, tt]));

    const eventDateTime = new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'full', timeStyle: 'short',
    }).format(new Date(order.event.startDateTime));

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
            ? new Date(ticket.checkIn.checkedInAt).toLocaleString('en-KE')
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
        holderEmail: ticket.user.email,
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

  async streamPdf(userId: string, role: string, id: string): Promise<StreamableFile> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (role !== 'ADMIN' && role !== 'ORGANIZER' && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    const buf = await this.generatePdfBuffer(id);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `attachment; filename="ticket-${ticket.ticketCode}.pdf"`,
    });
  }
}
