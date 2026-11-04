import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AI_FEATURES } from '../ai/ai-features';
import { redactPersonalData, sanitizeForPrompt, UNTRUSTED_CONTENT_RULE, untrusted } from '../ai/ai-safety';
import { AiDraftsService } from './ai-drafts.service';
import { SalesAnalyticsService } from './sales-analytics.service';
import {
  EventAssistantOutputSchema,
  findRiskyClaims,
  MarketingChannel,
  MarketingOutputSchema,
  OpsReportSchema,
  SalesNarrativeSchema,
} from './schemas';
import { EventAssistantDto, MarketingDto } from './ai-assist.dto';

const CHANNEL_BRIEFS: Record<MarketingChannel, string> = {
  TIKTOK: 'TikTok caption: punchy hook in the first line, under 300 characters, 3-6 hashtags.',
  INSTAGRAM: 'Instagram caption: 2-4 short paragraphs, line breaks, emoji used sparingly, 5-10 hashtags.',
  FACEBOOK: 'Facebook post: friendly, informative, one clear call to action.',
  WHATSAPP: 'WhatsApp Business broadcast message: short, personal, plain text, no hashtags, include the ticket link placeholder {{TICKET_LINK}}. Only for recipients who opted in.',
  EMAIL: 'Marketing email: subject line in title, body with greeting, key details, call to action, and a line saying how to unsubscribe ({{UNSUBSCRIBE_LINK}}).',
  SEO: 'SEO: title under 60 characters in title, meta description under 155 characters in body.',
  CTA: 'Call-to-action button and banner lines: 3 options in body, one per line, each under 40 characters.',
};

function formatKenyaTime(d: Date) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(d) + ' EAT';
}

const ORGANIZER_COPY_RULES = [
  'You write copy for organisers on TicketFlow Kenya, an event ticketing platform. Your output is a DRAFT the organiser will review and edit.',
  'Hard rules:',
  '- Use only the facts provided. Never invent performers, speakers, celebrities, sponsors, partners, discounts, promo codes, prizes or giveaways.',
  '- Never state or suggest ticket prices, dates or times other than those provided. Do not set prices.',
  '- Do not claim the event is sold out, almost sold out, or limited unless the facts say so.',
  '- Kiswahili output must be natural Kenyan Kiswahili, not a word-for-word translation.',
  UNTRUSTED_CONTENT_RULE,
].join('\n');

/**
 * Organiser- and admin-facing generation. Everything returned is a draft or an
 * explanation; nothing here writes to events, ticket types, payments or users.
 */
@Injectable()
export class AiAssistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly drafts: AiDraftsService,
    private readonly analytics: SalesAnalyticsService,
    private readonly config: ConfigService,
  ) {}

  private async ownedEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: { select: { userId: true, companyName: true } }, category: true, ticketTypes: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizer.userId !== userId) throw new ForbiddenException('You do not manage this event');
    return event;
  }

  // ── AI Event Assistant ───────────────────────────────────────────────────

  async eventAssistant(userId: string, dto: EventAssistantDto) {
    let category = dto.categoryName;
    if (dto.categoryId) {
      category = (await this.prisma.eventCategory.findUnique({ where: { id: dto.categoryId } }))?.name ?? category;
    }
    if (dto.eventId) await this.ownedEvent(dto.eventId, userId);

    const facts = {
      name: sanitizeForPrompt(dto.name, 150),
      category: sanitizeForPrompt(category, 60) || 'unspecified',
      venue: sanitizeForPrompt(dto.venue, 150),
      location: sanitizeForPrompt(dto.city, 80),
      startsAt: dto.startDateTime ? formatKenyaTime(new Date(dto.startDateTime)) : 'not set yet',
      endsAt: dto.endDateTime ? formatKenyaTime(new Date(dto.endDateTime)) : 'not set yet',
      targetAudience: sanitizeForPrompt(dto.targetAudience, 300),
    };
    const wantSw = dto.languages.includes('sw');

    const { data, model } = await this.ai.generate({
      feature: AI_FEATURES.EVENT_ASSISTANT,
      userId,
      maxTokens: 8000,
      effort: 'low',
      schema: EventAssistantOutputSchema,
      system: [
        ORGANIZER_COPY_RULES,
        '- Agenda items use relative labels ("Doors open", "Opening", "Session 2") — never clock times.',
        '- Suggest ticket tier NAMES only (with a category). Never suggest prices or quantities.',
        '- FAQs answer only what the facts or general TicketFlow behaviour support: tickets are QR codes delivered by email and under My Tickets, payment is by M-Pesa, each QR admits one person once.',
        wantSw ? '- Produce both `en` and `sw`.' : '- Produce `en` only and set `sw` to null.',
      ].join('\n'),
      user: [
        'EVENT FACTS (trusted):',
        JSON.stringify(facts, null, 2),
        '',
        "ORGANISER'S OWN NOTES (untrusted):",
        untrusted('organiser_description', redactPersonalData(dto.basicDescription), 3000),
      ].join('\n'),
    });

    if (!wantSw) data.sw = null;
    const factText = `${JSON.stringify(facts)} ${dto.basicDescription}`;
    const warnings = findRiskyClaims(JSON.stringify(data), factText);

    const draft = await this.drafts.create({
      feature: AI_FEATURES.EVENT_ASSISTANT,
      ownerId: userId,
      eventId: dto.eventId,
      language: dto.languages.join(','),
      input: { ...facts, basicDescription: dto.basicDescription },
      output: { ...data, warnings, model },
    });
    return draft;
  }

  // ── AI Marketing Studio ──────────────────────────────────────────────────

  async marketing(userId: string, dto: MarketingDto) {
    const event = await this.ownedEvent(dto.eventId, userId);
    const frontend = (this.config.get<string>('FRONTEND_URL') || 'https://ticketflow-frontend-w47s.onrender.com').replace(/\/$/, '');

    const facts = {
      title: event.title,
      subtitle: event.subtitle,
      organiser: event.organizerName || event.organizer.companyName,
      category: event.category.name,
      venue: event.venue,
      city: event.city,
      startsAt: formatKenyaTime(event.startDateTime),
      endsAt: formatKenyaTime(event.endDateTime),
      ticketsOnSale: event.status === 'PUBLISHED' && event.salesEnabled,
      eventStatus: event.status,
      ticketLink: `${frontend}/events/${event.id}`,
      tiers: event.ticketTypes.map((t) => ({
        name: t.name,
        priceKes: Number(t.price),
        soldOut: t.quantity - t.quantitySold <= 0,
      })),
      paymentMethod: 'M-Pesa',
    };

    const channels = dto.channels as MarketingChannel[];
    const { data, model } = await this.ai.generate({
      feature: AI_FEATURES.MARKETING_STUDIO,
      userId,
      maxTokens: 8000,
      effort: 'low',
      schema: MarketingOutputSchema,
      system: [
        ORGANIZER_COPY_RULES,
        `- Write exactly one piece per requested channel and language: channels ${channels.join(', ')}; languages ${dto.languages.join(', ')}.`,
        '- Channel briefs:',
        ...channels.map((c) => `  - ${c}: ${CHANNEL_BRIEFS[c]}`),
        '- If ticketsOnSale is false, do not tell people to buy now; say tickets are coming soon.',
        '- campaignIdeas: practical, low-cost promotion ideas grounded in the facts (timing relative to the event date). No invented partners or offers.',
      ].join('\n'),
      user: [
        'EVENT FACTS (trusted, from TicketFlow records):',
        JSON.stringify(facts, null, 2),
        `Tone: ${sanitizeForPrompt(dto.tone, 40) || 'friendly and energetic'}`,
        dto.notes ? `ORGANISER NOTES (untrusted):\n${untrusted('organiser_notes', redactPersonalData(dto.notes), 1500)}` : '',
        event.description ? `EVENT DESCRIPTION (untrusted, written by the organiser):\n${untrusted('event_description', event.description, 3000)}` : '',
      ].join('\n'),
    });

    const factText = `${JSON.stringify(facts)} ${event.description} ${dto.notes ?? ''}`;
    const warnings = findRiskyClaims(JSON.stringify(data), factText);

    return this.drafts.create({
      feature: AI_FEATURES.MARKETING_STUDIO,
      ownerId: userId,
      eventId: event.id,
      language: dto.languages.join(','),
      input: { channels, languages: dto.languages, tone: dto.tone, notes: dto.notes ?? null },
      output: {
        ...data,
        warnings,
        model,
        delivery: {
          automated: false,
          note: 'Copy these drafts into your own channels. Automated sending needs an authorised messaging provider, recipient opt-in and your approval, and is not enabled.',
        },
      },
    });
  }

  // ── AI Sales Insights ────────────────────────────────────────────────────

  async explainSales(eventId: string, userId: string, role: string) {
    const metrics = await this.analytics.eventMetrics(eventId, userId, role);
    const { event, ...numbers } = metrics;
    const { data, model } = await this.ai.generate({
      feature: AI_FEATURES.SALES_INSIGHTS,
      userId,
      maxTokens: 3000,
      effort: 'medium',
      schema: SalesNarrativeSchema,
      system: [
        'You are a sales analyst for event organisers on TicketFlow Kenya.',
        'Explain the metrics you are given and suggest practical improvements.',
        '- Use only numbers that appear in the METRICS. Never invent figures, competitors, or market data.',
        '- When the forecast is unavailable or confidence is low, say so plainly in caveats instead of guessing.',
        '- Recommendations must be actions the organiser controls (marketing, timing, tier naming, communication). Do not recommend specific prices; you may suggest reviewing pricing.',
        '- Amounts are in KES. Rates are fractions (0.25 = 25%).',
      ].join('\n'),
      user: `EVENT: ${event.title} (${event.status}), starts ${formatKenyaTime(event.startDateTime)} in ${event.city}\nMETRICS:\n${JSON.stringify(numbers)}`,
    });
    return { narrative: data, model, metrics, aiGenerated: true };
  }

  // ── Admin Operations Copilot ─────────────────────────────────────────────

  async opsMetrics(period: 'daily' | 'weekly', now = new Date()) {
    const days = period === 'daily' ? 1 : 7;
    const since = new Date(now.getTime() - days * 86_400_000);
    const previous = new Date(since.getTime() - days * 86_400_000);

    const sales = async (from: Date, to: Date) => {
      const agg = await this.prisma.order.aggregate({
        where: { status: 'PAID', updatedAt: { gte: from, lt: to } },
        _sum: { totalAmount: true, platformFee: true },
        _count: { _all: true },
      });
      const tickets = await this.prisma.ticket.count({ where: { createdAt: { gte: from, lt: to } } });
      return {
        paidOrders: agg._count._all,
        grossSalesKes: Number(agg._sum.totalAmount ?? 0),
        commissionKes: Number(agg._sum.platformFee ?? 0),
        ticketsIssued: tickets,
      };
    };

    const [current, prior, payments, pendingVerifications, overdueVerifications, openTickets, alerts, pendingEvents, topEvents] = await Promise.all([
      sales(since, now),
      sales(previous, since),
      this.prisma.payment.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.organizerProfile.count({ where: { verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.organizerProfile.count({
        where: { verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, verificationSubmittedAt: { lt: new Date(now.getTime() - 2 * 86_400_000) } },
      }),
      this.prisma.supportTicket.groupBy({ by: ['category', 'priority'], where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, _count: { _all: true } }),
      this.prisma.operationalAlert.groupBy({ by: ['category', 'severity'], where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, _count: { _all: true } }),
      this.prisma.event.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.order.groupBy({
        by: ['eventId'],
        where: { status: 'PAID', updatedAt: { gte: since } },
        _sum: { totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ]);
    const titles = await this.prisma.event.findMany({ where: { id: { in: topEvents.map((e) => e.eventId) } }, select: { id: true, title: true } });

    return {
      period,
      from: since,
      to: now,
      sales: current,
      previousPeriod: prior,
      payments: Object.fromEntries(payments.map((p) => [p.status, p._count._all])),
      verification: { pending: pendingVerifications, overdue48h: overdueVerifications },
      support: { open: openTickets.reduce((n, r) => n + r._count._all, 0), byCategory: openTickets.map((r) => ({ category: r.category, priority: r.priority, count: r._count._all })) },
      alerts: alerts.map((a) => ({ category: a.category, severity: a.severity, count: a._count._all })),
      eventsAwaitingApproval: pendingEvents,
      topEvents: topEvents.map((e) => ({
        title: titles.find((t) => t.id === e.eventId)?.title ?? e.eventId,
        paidOrders: e._count._all,
        grossSalesKes: Number(e._sum.totalAmount ?? 0),
      })),
    };
  }

  async opsReport(period: 'daily' | 'weekly', adminId: string) {
    const metrics = await this.opsMetrics(period);
    const { data, model } = await this.ai.generate({
      feature: AI_FEATURES.ADMIN_COPILOT,
      userId: adminId,
      maxTokens: 3000,
      effort: 'medium',
      schema: OpsReportSchema,
      system: [
        `You write the ${period} operating report for the admins of TicketFlow Kenya, an event ticketing platform paid through M-Pesa.`,
        '- Use only the METRICS. Never invent numbers. Compare with previousPeriod where useful.',
        '- You are read-only: recommended actions are suggestions for humans and must go through normal admin tools. Never recommend automatic bans, refunds, fund freezes or KYC rejections.',
        '- Prioritise: unresolved CRITICAL alerts, payment problems, overdue verifications, open HIGH-priority support tickets, events awaiting approval.',
      ].join('\n'),
      user: `METRICS:\n${JSON.stringify(metrics)}`,
    });
    return { report: data, model, metrics, aiGenerated: true };
  }
}

