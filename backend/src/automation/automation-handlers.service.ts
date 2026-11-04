import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TicketsService } from '../tickets/tickets.service';
import { AutomationQueueService } from './automation-queue.service';
import { JOB_TYPES } from './job-types';

function formatWhen(value: Date, timeZone = 'Africa/Nairobi') {
  return `${new Intl.DateTimeFormat('en-KE', { dateStyle: 'full', timeStyle: 'short', timeZone }).format(value)}${timeZone === 'Africa/Nairobi' ? ' EAT' : ''}`;
}

/**
 * Handlers for every background job. Each one re-reads current state before
 * acting, so a job queued a while ago does nothing if the situation has moved
 * on (the buyer paid after all, the event was cancelled, the organiser was
 * verified). That re-check is also what makes at-least-once delivery safe.
 */
@Injectable()
export class AutomationHandlersService implements OnModuleInit {
  private readonly logger = new Logger(AutomationHandlersService.name);

  constructor(
    private readonly queue: AutomationQueueService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly tickets: TicketsService,
    private readonly config: ConfigService,
  ) {}

  private get frontendUrl() {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  onModuleInit() {
    this.queue.registerHandler(JOB_TYPES.TICKET_EMAIL, (p) => this.ticketEmail(p));
    this.queue.registerHandler(JOB_TYPES.PAYMENT_FAILED_NOTICE, (p) => this.paymentFailedNotice(p));
    this.queue.registerHandler(JOB_TYPES.EVENT_REMINDER, (p) => this.eventReminder(p));
    this.queue.registerHandler(JOB_TYPES.VERIFICATION_REMINDER, (p) => this.verificationReminder(p));
    this.queue.registerHandler(JOB_TYPES.ADMIN_ALERT_EMAIL, (p) => this.adminAlertEmail(p));
  }

  async ticketEmail({ ticketId }: { ticketId: string }) {
    await this.tickets.deliverTicketEmail(ticketId);
  }

  async paymentFailedNotice({ paymentId }: { paymentId: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { event: true, user: true } } },
    });
    if (!payment || payment.status !== 'FAILED') return;
    // The buyer retried and paid, or is mid-retry: nothing to tell them.
    if (payment.order.status === 'PAID') return;
    const newer = await this.prisma.payment.count({
      where: { orderId: payment.orderId, createdAt: { gt: payment.createdAt } },
    });
    if (newer > 0) return;

    await this.email.sendNotificationEmail({
      to: payment.order.user.email,
      subject: `Your M-Pesa payment for ${payment.order.event.title} did not go through`,
      heading: 'Your payment did not go through',
      paragraphs: [
        `Hi ${payment.order.user.firstName}, M-Pesa could not complete your payment for order ${payment.order.orderNumber} (${payment.order.event.title}).`,
        payment.resultDesc ? `M-Pesa said: "${payment.resultDesc}"` : 'No money was taken for this attempt.',
        'No tickets were issued for this attempt. If you still want to attend, you can try again — tickets are subject to availability.',
        'If money left your M-Pesa account, do not pay again: reply to this email or contact support with your M-Pesa message and we will check it for you.',
      ],
      cta: { label: 'Try again', url: `${this.frontendUrl}/checkout/${payment.orderId}` },
    });
  }

  async eventReminder({ orderId }: { orderId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true, user: true, _count: { select: { tickets: true } } },
    });
    if (!order || order.status !== 'PAID' || order._count.tickets === 0) return;
    if (order.event.status !== 'PUBLISHED' || order.event.startDateTime <= new Date()) return;

    await this.email.sendNotificationEmail({
      to: order.user.email,
      subject: `Reminder: ${order.event.title} is tomorrow`,
      heading: `${order.event.title} is coming up`,
      paragraphs: [
        `Hi ${order.user.firstName}, this is a reminder that ${order.event.title} starts ${formatWhen(order.event.startDateTime, order.event.timezone)}.`,
        `Venue: ${order.event.venue}, ${order.event.city}.`,
        `You have ${order._count.tickets} ticket(s) on order ${order.orderNumber}. Have your QR code ready at the gate — each code admits one person once, so keep it private.`,
      ],
      cta: { label: 'View my tickets', url: `${this.frontendUrl}/dashboard/tickets` },
    });
  }

  async verificationReminder({ organizerId }: { organizerId: string }) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { id: organizerId }, include: { user: true } });
    if (!profile || !['IN_PROGRESS', 'CHANGES_REQUIRED', 'NOT_STARTED'].includes(profile.verificationStatus)) return;

    const changes = profile.verificationStatus === 'CHANGES_REQUIRED';
    await this.email.sendNotificationEmail({
      to: profile.user.email,
      subject: changes ? 'Action needed on your TicketFlow verification' : 'Finish verifying your organiser account',
      heading: changes ? 'Your verification needs a few changes' : 'Your verification is not finished yet',
      paragraphs: [
        `Hi ${profile.user.firstName}, ${changes ? 'our team reviewed your organiser verification and asked for some changes.' : 'you started verifying your organiser account but have not submitted it yet.'}`,
        ...(changes && profile.verificationReviewNote ? [`Reviewer note: ${profile.verificationReviewNote}`] : []),
        'Ticket sales open once your organisation is verified.',
      ],
      cta: { label: 'Continue verification', url: `${this.frontendUrl}/organizer/verification` },
    });
  }

  async adminAlertEmail({ alertId }: { alertId: string }) {
    const recipients = (this.config.get<string>('ADMIN_ALERT_EMAILS') || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (!recipients.length) return;
    const alert = await this.prisma.operationalAlert.findUnique({ where: { id: alertId } });
    if (!alert || alert.status !== 'OPEN') return;

    for (const to of recipients) {
      await this.email.sendNotificationEmail({
        to,
        subject: `[TicketFlow ${alert.severity}] ${alert.title}`,
        heading: alert.title,
        paragraphs: [
          `Kind: ${alert.kind} · Category: ${alert.category}`,
          `Entity: ${alert.entityType ?? '—'} ${alert.entityId ?? ''}`.trim(),
          'Review and record a decision in the admin AI Operations dashboard. No automatic action has been taken.',
        ],
        cta: { label: 'Open AI Operations', url: `${this.frontendUrl}/admin/ai-operations` },
      });
    }
    this.logger.log(`Alert ${alert.id} emailed to ${recipients.length} admin(s)`);
  }
}
