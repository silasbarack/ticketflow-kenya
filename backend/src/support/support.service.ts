import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AiService, AiUnavailableException } from '../ai/ai.service';
import { AI_FEATURES } from '../ai/ai-features';
import { redactPersonalData, screenUserInput, UNTRUSTED_CONTENT_RULE, untrusted } from '../ai/ai-safety';
import { OperationalAlertsService } from '../automation/operational-alerts.service';
import { findHelpArticles, HELP_ARTICLES, HelpArticle } from './help-centre';

/** Routes the assistant may link to. Anything else is dropped. */
const ALLOWED_LINK_PREFIXES = ['/events', '/dashboard', '/dashboard/tickets', '/checkout/', '/tickets/', '/legal/', '/organizer', '/register', '/login', '/forgot-password'];

export const SupportAnswerSchema = z.object({
  answer: z.string().min(1).max(2500),
  intent: z.enum(['EVENT_INFO', 'TICKET_AVAILABILITY', 'PURCHASE_HELP', 'PAYMENT_HELP', 'TICKET_ACCESS', 'REFUND_POLICY', 'ORGANIZER_HELP', 'ACCOUNT', 'OTHER']),
  needsHuman: z.boolean(),
  suggestedLinks: z.array(z.object({ label: z.string().max(60), href: z.string().max(200) })).max(4),
  citedEventIds: z.array(z.string().max(64)).max(5),
});
export type SupportAnswer = z.infer<typeof SupportAnswerSchema>;

interface OrderFact {
  orderNumber: string;
  event: string;
  eventStarts: string;
  orderStatus: string;
  latestPaymentStatus: string | null;
  tickets: number;
  createdAt: string;
  orderId: string;
}

interface EventFact {
  id: string;
  title: string;
  starts: string;
  venue: string;
  city: string;
  salesOpen: boolean;
  tiers: { name: string; priceKes: number; remaining: number; status: string }[];
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'when', 'where', 'what', 'how', 'are', 'is', 'there', 'tickets', 'ticket', 'event', 'events', 'with', 'about', 'can', 'you', 'this', 'that', 'have', 'does', 'still', 'available']);

/**
 * Says something firm about money that only our records may say. If the model
 * claims a payment is confirmed / a refund is approved and the user's own
 * records do not show it, the answer is replaced — the assistant must never
 * fabricate payment confirmation or refund eligibility.
 */
export function findUnsupportedClaims(answer: string, orders: OrderFact[]): string[] {
  const problems: string[] = [];
  const text = answer.toLowerCase();
  const claimsPaid = /\b(payment|order)\b[^.]{0,40}\b(is|was|has been|have been)\b[^.]{0,20}\b(confirmed|successful|received|completed|paid)\b/.test(text)
    || /\byour (tickets?|order) (is|are|has been) (confirmed|paid|issued)\b/.test(text);
  if (claimsPaid && !orders.some((o) => o.orderStatus === 'PAID')) problems.push('payment_confirmation');
  const claimsRefund = /\b(refund)\b[^.]{0,40}\b(approved|processed|issued|guaranteed|eligible|will be (sent|issued|processed))\b/.test(text)
    || /\byou (are|will be) (eligible|entitled) (for|to) a refund\b/.test(text);
  if (claimsRefund && !/cancel/.test(text)) problems.push('refund_eligibility');
  return problems;
}

export function sanitizeLinks(links: { label: string; href: string }[]) {
  return links.filter(
    (l) => l.href.startsWith('/') && !l.href.startsWith('//') && ALLOWED_LINK_PREFIXES.some((p) => l.href === p || l.href.startsWith(p)),
  );
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeReference() {
  return `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditLogsService,
    private readonly alerts: OperationalAlertsService,
    private readonly config: ConfigService,
  ) {}

  // ── Conversation access ──────────────────────────────────────────────────

  /**
   * A conversation belongs to a signed-in user, or to whoever holds its access
   * token (signed-out visitors). Nobody else can read or continue it.
   */
  private async loadConversation(conversationId: string, viewer: { userId?: string; accessToken?: string }) {
    const convo = await this.prisma.supportConversation.findUnique({ where: { id: conversationId } });
    if (!convo) throw new NotFoundException('Conversation not found');
    const ownsByUser = convo.userId && viewer.userId === convo.userId;
    const ownsByToken = !convo.userId && viewer.accessToken && convo.accessTokenHash === hashToken(viewer.accessToken);
    if (!ownsByUser && !ownsByToken) throw new ForbiddenException('You do not have access to this conversation');
    return convo;
  }

  // ── Grounding ────────────────────────────────────────────────────────────

  private async findEvents(message: string): Promise<EventFact[]> {
    const terms = message
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
      .slice(0, 6);

    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        endDateTime: { gte: now },
        ...(terms.length
          ? {
              OR: terms.flatMap((t) => [
                { title: { contains: t, mode: 'insensitive' as const } },
                { venue: { contains: t, mode: 'insensitive' as const } },
                { city: { contains: t, mode: 'insensitive' as const } },
                { category: { name: { contains: t, mode: 'insensitive' as const } } },
              ]),
            }
          : {}),
      },
      include: { ticketTypes: true },
      orderBy: { startDateTime: 'asc' },
      take: 5,
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      starts: e.startDateTime.toISOString(),
      venue: e.venue,
      city: e.city,
      salesOpen: e.salesEnabled,
      tiers: e.ticketTypes.map((t) => ({
        name: t.name,
        priceKes: Number(t.price),
        remaining: Math.max(t.quantity - t.quantitySold, 0),
        status: t.quantity - t.quantitySold <= 0 ? 'SOLD_OUT' : t.availabilityStatus,
      })),
    }));
  }

  /** Only the caller's own orders, fetched by our code — the model never asks for data. */
  private async findOwnOrders(userId: string): Promise<OrderFact[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        event: { select: { title: true, startDateTime: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      event: o.event.title,
      eventStarts: o.event.startDateTime.toISOString(),
      orderStatus: o.status,
      latestPaymentStatus: o.payments[0]?.status ?? null,
      tickets: o._count.tickets,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  async chat(params: { message: string; conversationId?: string; accessToken?: string; userId?: string }) {
    const message = params.message.trim();
    if (!message) throw new BadRequestException('Message is required');
    if (message.length > 1500) throw new BadRequestException('Message is too long');

    let conversation;
    let newAccessToken: string | undefined;
    if (params.conversationId) {
      conversation = await this.loadConversation(params.conversationId, params);
      if (conversation.status === 'CLOSED') throw new BadRequestException('This conversation is closed');
    } else {
      newAccessToken = params.userId ? undefined : crypto.randomBytes(24).toString('base64url');
      conversation = await this.prisma.supportConversation.create({
        data: { userId: params.userId ?? null, accessTokenHash: newAccessToken ? hashToken(newAccessToken) : null },
      });
    }

    const screen = screenUserInput(message);
    await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
        flagged: screen.flagged,
        flagReason: screen.reasons.join(',') || null,
      },
    });

    const history = await this.prisma.supportMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 9,
    });

    const [events, orders] = await Promise.all([
      this.findEvents(message),
      params.userId ? this.findOwnOrders(params.userId) : Promise.resolve([] as OrderFact[]),
    ]);
    const articles = findHelpArticles(message);

    const reply = screen.reasons.includes('state_change_request')
      ? this.stateChangeRefusal()
      : await this.answer({ message, history: history.reverse().slice(0, -1), events, orders, articles, userId: params.userId ?? null, signedIn: Boolean(params.userId) });

    const saved = await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: reply.answer,
        usedAccountData: orders.length > 0,
      },
    });
    await this.prisma.supportConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    return {
      conversationId: conversation.id,
      accessToken: newAccessToken,
      message: {
        id: saved.id,
        role: 'ASSISTANT',
        content: reply.answer,
        createdAt: saved.createdAt,
        aiGenerated: reply.aiGenerated,
      },
      intent: reply.intent,
      needsHuman: reply.needsHuman,
      suggestedLinks: reply.suggestedLinks,
      events: events.filter((e) => reply.citedEventIds.includes(e.id)).map((e) => ({ id: e.id, title: e.title, starts: e.starts, venue: e.venue, city: e.city })),
      escalationAvailable: conversation.status !== 'ESCALATED',
    };
  }

  private stateChangeRefusal() {
    return {
      answer:
        'I can’t change the status of a payment, order or ticket — only a confirmation from M-Pesa can mark a payment as paid, and refunds are decided by the TicketFlow team. ' +
        'If money left your M-Pesa account but your order is not paid, I can create a support ticket so the team can check it with your M-Pesa transaction code.',
      intent: 'PAYMENT_HELP' as const,
      needsHuman: true,
      suggestedLinks: [{ label: 'Payment policy', href: '/legal/payment-policy' }],
      citedEventIds: [],
      aiGenerated: false,
    };
  }

  /** Used when AI is off or unavailable: the help centre still answers. */
  fallbackAnswer(articles: HelpArticle[]) {
    const picked = articles.length ? articles.slice(0, 2) : [HELP_ARTICLES.find((a) => a.id === 'contact')!];
    return {
      answer: picked.map((a) => `${a.title}: ${a.body}`).join('\n\n'),
      intent: 'OTHER' as const,
      needsHuman: articles.length === 0,
      suggestedLinks: picked.map((a) => ({ label: a.title, href: a.source })),
      citedEventIds: [],
      aiGenerated: false,
    };
  }

  private async answer(ctx: {
    message: string;
    history: { role: string; content: string }[];
    events: EventFact[];
    orders: OrderFact[];
    articles: HelpArticle[];
    userId: string | null;
    signedIn: boolean;
  }) {
    const system = [
      'You are the customer support assistant for TicketFlow Kenya, an event ticketing platform. Customers pay with M-Pesa STK Push.',
      'Answer only from the HELP CENTRE, EVENTS and YOUR ORDERS sections provided. If the answer is not there, say you are not sure and offer to create a support ticket (needsHuman=true).',
      'Rules you must always follow:',
      '- Never state that a payment is confirmed, successful or received unless YOUR ORDERS shows that order with orderStatus PAID.',
      '- Never promise or decide refund eligibility. Explain the published refund policy and say the TicketFlow team decides individual cases.',
      '- You cannot change payments, orders, tickets, events or accounts, and must not claim to have done so.',
      '- Never reveal or guess information about any other customer. YOUR ORDERS contains only the signed-in user\'s own orders.',
      ctx.signedIn
        ? '- The user is signed in; use YOUR ORDERS for questions about their bookings.'
        : '- The user is not signed in. For questions about a specific booking, ask them to sign in (link /login) or create a support ticket. Never ask for passwords, PINs or full card/ID numbers.',
      '- Use KES for prices exactly as listed. Do not invent events, dates, prices, performers, discounts or availability.',
      '- Reply in the language the user wrote in (English or Kiswahili). Keep answers short and practical.',
      '- citedEventIds may only contain ids from EVENTS. suggestedLinks hrefs must be site paths such as /events/<id>, /dashboard/tickets, /legal/ticket-purchase-policy.',
      UNTRUSTED_CONTENT_RULE,
    ].join('\n');

    const user = [
      'HELP CENTRE:',
      (ctx.articles.length ? ctx.articles : HELP_ARTICLES.slice(0, 4)).map((a) => `[${a.id}] ${a.title}: ${a.body} (source ${a.source})`).join('\n'),
      '',
      'EVENTS (published, upcoming; prices in KES):',
      ctx.events.length ? JSON.stringify(ctx.events) : 'No matching events found.',
      '',
      'YOUR ORDERS:',
      ctx.signedIn ? (ctx.orders.length ? JSON.stringify(ctx.orders.map(({ orderId, ...o }) => o)) : 'The user has no orders.') : 'Not signed in.',
      '',
      'CONVERSATION SO FAR:',
      ctx.history.length
        ? ctx.history.map((m) => `${m.role}: ${untrusted('chat_history', redactPersonalData(m.content), 800)}`).join('\n')
        : '(none)',
      '',
      'NEW MESSAGE:',
      untrusted('customer_message', redactPersonalData(ctx.message), 1500),
    ].join('\n');

    let result: SupportAnswer;
    try {
      ({ data: result } = await this.ai.generate({
        feature: AI_FEATURES.SUPPORT_CHAT,
        userId: ctx.userId,
        system,
        user,
        schema: SupportAnswerSchema,
        maxTokens: 1500,
        effort: 'low',
      }));
    } catch (error) {
      if (error instanceof AiUnavailableException) return this.fallbackAnswer(ctx.articles);
      throw error;
    }

    // Output checks: never trust the model on money, links or citations.
    const problems = findUnsupportedClaims(result.answer, ctx.orders);
    if (problems.length) {
      this.logger.warn(`Support answer replaced: unsupported ${problems.join(', ')}`);
      return {
        answer:
          'I can’t confirm that from here. Payment status comes only from M-Pesa’s confirmation, and refunds are decided by the TicketFlow team. ' +
          'You can check your order under My Tickets, or I can create a support ticket so the team can look into it.',
        intent: result.intent,
        needsHuman: true,
        suggestedLinks: [{ label: 'My tickets', href: '/dashboard/tickets' }],
        citedEventIds: [],
        aiGenerated: false,
      };
    }

    const knownIds = new Set(ctx.events.map((e) => e.id));
    return {
      ...result,
      suggestedLinks: sanitizeLinks(result.suggestedLinks),
      citedEventIds: result.citedEventIds.filter((id) => knownIds.has(id)),
      aiGenerated: true,
    };
  }

  // ── History, feedback, escalation ────────────────────────────────────────

  async getConversation(conversationId: string, viewer: { userId?: string; accessToken?: string }) {
    const convo = await this.loadConversation(conversationId, viewer);
    const messages = await this.prisma.supportMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, feedback: true, createdAt: true },
    });
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { conversationId: convo.id },
      select: { reference: true, status: true },
    });
    return { id: convo.id, status: convo.status, createdAt: convo.createdAt, messages, ticket };
  }

  listMyConversations(userId: string) {
    return this.prisma.supportConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true } } },
    });
  }

  async feedback(messageId: string, viewer: { userId?: string; accessToken?: string }, value: 1 | -1, note?: string) {
    const msg = await this.prisma.supportMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.role !== 'ASSISTANT') throw new NotFoundException('Message not found');
    await this.loadConversation(msg.conversationId, viewer);
    return this.prisma.supportMessage.update({
      where: { id: messageId },
      data: { feedback: value, feedbackNote: note?.slice(0, 500) ?? null },
      select: { id: true, feedback: true },
    });
  }

  async createTicket(params: {
    viewer: { userId?: string; accessToken?: string };
    conversationId?: string;
    subject: string;
    description: string;
    category: string;
    contactEmail?: string;
    orderNumber?: string;
  }) {
    const { viewer } = params;
    if (!viewer.userId && !params.contactEmail) throw new BadRequestException('A contact email is required');

    if (params.conversationId) {
      await this.loadConversation(params.conversationId, viewer);
      const existing = await this.prisma.supportTicket.findFirst({ where: { conversationId: params.conversationId } });
      if (existing) return { reference: existing.reference, status: existing.status, alreadyEscalated: true };
    }

    // An order can only be attached by its owner — never someone else's.
    let orderId: string | null = null;
    if (params.orderNumber && viewer.userId) {
      const order = await this.prisma.order.findFirst({ where: { orderNumber: params.orderNumber, userId: viewer.userId }, select: { id: true } });
      orderId = order?.id ?? null;
    }

    const priority = params.category === 'PAYMENT' ? 'HIGH' : params.category === 'REFUND' ? 'NORMAL' : 'NORMAL';
    const ticket = await this.prisma.supportTicket.create({
      data: {
        reference: makeReference(),
        conversationId: params.conversationId ?? null,
        userId: viewer.userId ?? null,
        contactEmail: params.contactEmail ?? null,
        subject: params.subject,
        description: params.description,
        category: params.category,
        priority,
        orderId,
      },
    });

    if (params.conversationId) {
      await this.prisma.supportConversation.update({ where: { id: params.conversationId }, data: { status: 'ESCALATED' } });
    }

    await this.audit.log({
      actorId: viewer.userId ?? null,
      action: 'SUPPORT_ESCALATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      metadata: { reference: ticket.reference, category: ticket.category, priority, fromConversation: Boolean(params.conversationId) },
    });

    if (priority === 'HIGH') {
      await this.alerts.raise({
        kind: 'SUPPORT_PAYMENT_ISSUE',
        severity: 'WARNING',
        category: 'SUPPORT',
        title: 'Customer reported a payment problem',
        dedupeKey: `support-payment:${ticket.id}`,
        entityType: 'SupportTicket',
        entityId: ticket.id,
        details: { reference: ticket.reference, orderId },
      });
    }

    return { reference: ticket.reference, status: ticket.status, alreadyEscalated: false };
  }

  listMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { reference: true, subject: true, category: true, status: true, createdAt: true, resolutionNote: true },
    });
  }

  // ── Admin review ─────────────────────────────────────────────────────────

  adminListTickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
  }

  async adminUpdateTicket(id: string, adminId: string, patch: { status?: string; priority?: string; resolutionNote?: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    const resolving = patch.status && ['RESOLVED', 'CLOSED'].includes(patch.status);
    if (resolving && !(patch.resolutionNote || ticket.resolutionNote)) {
      throw new BadRequestException('A resolution note is required to resolve a ticket');
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...patch,
        assignedToId: ticket.assignedToId ?? adminId,
        ...(resolving ? { resolvedAt: new Date() } : {}),
      },
    });
    await this.audit.log({
      actorId: adminId,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: id,
      metadata: { before: { status: ticket.status, priority: ticket.priority }, after: patch },
    });
    return updated;
  }

  async adminListConversations(filter: { flagged?: boolean; negative?: boolean }) {
    return this.prisma.supportConversation.findMany({
      where: {
        ...(filter.flagged ? { messages: { some: { flagged: true } } } : {}),
        ...(filter.negative ? { messages: { some: { feedback: -1 } } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true, createdAt: true } },
      },
    });
  }

  async adminGetConversation(id: string) {
    const convo = await this.prisma.supportConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    const ticket = await this.prisma.supportTicket.findFirst({ where: { conversationId: id } });
    return { ...convo, accessTokenHash: undefined, ticket };
  }

  async adminReply(id: string, adminId: string, content: string) {
    const convo = await this.prisma.supportConversation.findUnique({ where: { id } });
    if (!convo) throw new NotFoundException('Conversation not found');
    const msg = await this.prisma.supportMessage.create({ data: { conversationId: id, role: 'AGENT', content } });
    await this.audit.log({ actorId: adminId, action: 'SUPPORT_AGENT_REPLIED', entityType: 'SupportConversation', entityId: id });
    return msg;
  }

  async adminStats() {
    const [open, byStatus, feedback] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.supportMessage.groupBy({ by: ['feedback'], where: { role: 'ASSISTANT', feedback: { not: null } }, _count: { _all: true } }),
    ]);
    return {
      openTickets: open,
      ticketsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      helpful: feedback.find((r) => r.feedback === 1)?._count._all ?? 0,
      unhelpful: feedback.find((r) => r.feedback === -1)?._count._all ?? 0,
    };
  }

  // ── Retention ────────────────────────────────────────────────────────────

  /** Data minimisation: chat transcripts are not kept forever. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldConversations() {
    const days = parseInt(this.config.get<string>('SUPPORT_RETENTION_DAYS') || '180', 10);
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const linked = await this.prisma.supportTicket.findMany({
      where: { conversationId: { not: null }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { conversationId: true },
    });
    const { count } = await this.prisma.supportConversation.deleteMany({
      where: { updatedAt: { lt: cutoff }, id: { notIn: linked.map((l) => l.conversationId!) } },
    });
    if (count) this.logger.log(`Purged ${count} support conversation(s) older than ${days} days`);
    return count;
  }
}
