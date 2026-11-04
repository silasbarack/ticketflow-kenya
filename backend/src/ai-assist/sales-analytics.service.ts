import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const DAY = 86_400_000;

export interface DailyPoint {
  day: string;
  tickets: number;
  grossKes: number;
}

export interface Forecast {
  available: boolean;
  reason?: string;
  method?: string;
  daysOfHistory: number;
  daysRemaining: number;
  projectedAdditionalTickets?: { low: number; expected: number; high: number };
  projectedTotalTickets?: { low: number; expected: number; high: number };
  confidence?: 'low' | 'medium' | 'high';
}

/** Mean and standard deviation of a series. */
function stats(values: number[]) {
  const n = values.length || 1;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, sd: Math.sqrt(variance) };
}

/**
 * Sales forecast from the event's own history, with an explicit uncertainty
 * band. Refuses to forecast without enough data rather than guessing.
 */
export function forecastSales(params: {
  daily: DailyPoint[];
  firstSaleAt: Date | null;
  now: Date;
  eventStart: Date;
  sold: number;
  capacity: number;
}): Forecast {
  const { daily, firstSaleAt, now, eventStart, sold, capacity } = params;
  const daysRemaining = Math.max(Math.floor((eventStart.getTime() - now.getTime()) / DAY), 0);
  const daysOfHistory = firstSaleAt ? Math.max(Math.ceil((now.getTime() - firstSaleAt.getTime()) / DAY), 0) : 0;

  if (eventStart <= now) return { available: false, reason: 'The event has already started.', daysOfHistory, daysRemaining };
  if (daysOfHistory < 7) {
    return { available: false, reason: 'At least 7 days of sales history are needed for a forecast.', daysOfHistory, daysRemaining };
  }

  // Last 14 days of the series, zero-filled so quiet days count.
  const window = Math.min(daysOfHistory, 14);
  const byDay = new Map(daily.map((d) => [d.day, d.tickets]));
  const recent: number[] = [];
  for (let i = window - 1; i >= 0; i--) {
    recent.push(byDay.get(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10)) ?? 0);
  }
  const { mean, sd } = stats(recent);
  const remainingCapacity = Math.max(capacity - sold, 0);
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), remainingCapacity));

  // Uncertainty of a sum over `daysRemaining` days scales with sqrt(days).
  const spread = sd * Math.sqrt(daysRemaining) * 1.28; // ~80% band
  const expected = clamp(mean * daysRemaining);
  const low = clamp(mean * daysRemaining - spread);
  const high = clamp(mean * daysRemaining + spread);
  const cv = mean > 0 ? sd / mean : Infinity;
  const confidence: Forecast['confidence'] = daysOfHistory >= 14 && cv < 0.75 ? 'high' : daysOfHistory >= 10 && cv < 1.5 ? 'medium' : 'low';

  return {
    available: true,
    method: `Run-rate of the last ${window} days (mean ${mean.toFixed(1)} tickets/day, sd ${sd.toFixed(1)}), capped at remaining capacity.`,
    daysOfHistory,
    daysRemaining,
    projectedAdditionalTickets: { low, expected, high },
    projectedTotalTickets: { low: sold + low, expected: sold + expected, high: sold + high },
    confidence,
  };
}

/**
 * Every figure here is computed from database records — PAID orders, issued
 * tickets and check-ins. The AI layer explains these numbers; it never
 * supplies them.
 */
@Injectable()
export class SalesAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanView(eventId: string, userId: string, role: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: { select: { userId: true, id: true } }, ticketTypes: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (role !== 'ADMIN' && event.organizer.userId !== userId) throw new ForbiddenException('You do not manage this event');
    return event;
  }

  async eventMetrics(eventId: string, userId: string, role: string, now = new Date()) {
    const event = await this.assertCanView(eventId, userId, role);

    const [paidAgg, orderCounts, ticketsByTier, ticketStatus, checkIns, daily, firstSale, attempts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { eventId, status: 'PAID' },
        _sum: { totalAmount: true, organizerEarning: true, platformFee: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], where: { eventId }, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['ticketTypeId'], where: { order: { eventId, status: 'PAID' } }, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['status'], where: { order: { eventId } }, _count: { _all: true } }),
      this.prisma.checkIn.count({ where: { eventId } }),
      this.prisma.$queryRaw<{ day: Date; tickets: bigint; gross: unknown }[]>`
        SELECT date_trunc('day', o."updatedAt") AS day,
               COALESCE(SUM(oi.quantity), 0) AS tickets,
               COALESCE(SUM(oi.subtotal), 0) AS gross
        FROM orders o JOIN order_items oi ON oi."orderId" = o.id
        WHERE o."eventId" = ${eventId} AND o.status = 'PAID' AND o."updatedAt" >= ${new Date(now.getTime() - 60 * DAY)}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.order.findFirst({ where: { eventId, status: 'PAID' }, orderBy: { updatedAt: 'asc' }, select: { updatedAt: true } }),
      this.prisma.payment.count({ where: { order: { eventId } } }),
    ]);

    const countFor = (status: string) => orderCounts.find((r) => r.status === status)?._count._all ?? 0;
    const ordersCreated = orderCounts.reduce((n, r) => n + r._count._all, 0);
    const ticketStatusCount = (s: string) => ticketStatus.find((r) => r.status === s)?._count._all ?? 0;
    const ticketsSold = ticketStatusCount('ACTIVE') + ticketStatusCount('USED');
    const capacity = event.ticketTypes.reduce((n, t) => n + t.quantity, 0);

    const tiers = event.ticketTypes.map((t) => {
      const sold = ticketsByTier.find((r) => r.ticketTypeId === t.id)?._count._all ?? 0;
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        priceKes: Number(t.price),
        capacity: t.quantity,
        sold,
        sellThrough: t.quantity ? sold / t.quantity : 0,
        grossKes: sold * Number(t.price),
      };
    });

    const series: DailyPoint[] = daily.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      tickets: Number(d.tickets),
      grossKes: Number(d.gross),
    }));

    const sellThrough = capacity ? ticketsSold / capacity : 0;
    const daysToStart = (event.startDateTime.getTime() - now.getTime()) / DAY;
    const lowSales = event.status === 'PUBLISHED' && daysToStart > 0 && daysToStart <= 14 && sellThrough < 0.25;

    return {
      event: { id: event.id, title: event.title, status: event.status, startDateTime: event.startDateTime, city: event.city, venue: event.venue },
      totals: {
        ticketsSold,
        capacity,
        sellThrough,
        paidOrders: paidAgg._count._all,
        grossSalesKes: Number(paidAgg._sum.totalAmount ?? 0),
        ticketRevenueKes: Number(paidAgg._sum.organizerEarning ?? 0),
        organizerEarningsKes: Number(paidAgg._sum.organizerEarning ?? 0),
        platformFeesKes: Number(paidAgg._sum.platformFee ?? 0),
        refundedTickets: ticketStatusCount('REFUNDED'),
        cancelledTickets: ticketStatusCount('CANCELLED'),
        checkIns,
        checkInRate: ticketsSold ? checkIns / ticketsSold : null,
      },
      funnel: {
        note: 'Page views are not tracked, so the funnel starts at order creation.',
        ordersCreated,
        paymentAttempts: attempts,
        ordersPaid: countFor('PAID'),
        ordersFailed: countFor('FAILED'),
        ordersPending: countFor('PENDING'),
        orderToPaidRate: ordersCreated ? countFor('PAID') / ordersCreated : null,
      },
      tiers,
      daily: series,
      forecast: forecastSales({ daily: series, firstSaleAt: firstSale?.updatedAt ?? null, now, eventStart: event.startDateTime, sold: ticketsSold, capacity }),
      attendanceForecast: await this.attendanceForecast(event.organizer.id, ticketsSold, event.startDateTime, now),
      alerts: lowSales
        ? [{ kind: 'LOW_SALES', message: `Only ${Math.round(sellThrough * 100)}% of tickets sold with ${Math.ceil(daysToStart)} day(s) to go.` }]
        : [],
      computedAt: now,
    };
  }

  /** Uses the organiser's own past check-in rates; none means no forecast. */
  private async attendanceForecast(organizerId: string, ticketsSold: number, eventStart: Date, now: Date) {
    if (eventStart <= now) return { available: false, reason: 'Event has started; see actual check-ins.' };
    const past = await this.prisma.$queryRaw<{ eventId: string; sold: bigint; checked: bigint }[]>`
      SELECT e.id AS "eventId",
        (SELECT COUNT(*) FROM tickets t JOIN orders o ON o.id = t."orderId" WHERE o."eventId" = e.id AND o.status = 'PAID') AS sold,
        (SELECT COUNT(*) FROM check_ins c WHERE c."eventId" = e.id) AS checked
      FROM events e WHERE e."organizerId" = ${organizerId} AND e."endDateTime" < ${now}`;
    const usable = past.filter((p) => Number(p.sold) >= 10);
    if (usable.length < 2) {
      return { available: false, reason: 'Needs at least two past events with 10+ tickets sold to estimate turnout.' };
    }
    const rates = usable.map((p) => Number(p.checked) / Number(p.sold));
    const { mean, sd } = stats(rates);
    const clampRate = (r: number) => Math.min(Math.max(r, 0), 1);
    return {
      available: true,
      basedOnEvents: usable.length,
      expectedRate: clampRate(mean),
      range: { low: clampRate(mean - sd), high: clampRate(mean + sd) },
      expectedAttendees: Math.round(ticketsSold * clampRate(mean)),
      note: 'Applies your past turnout to tickets sold so far.',
    };
  }

  /** One row per event for the organiser overview, including low-sales flags. */
  async organizerOverview(userId: string, now = new Date()) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Organizer profile not found');
    const events = await this.prisma.event.findMany({
      where: { organizerId: profile.id },
      include: { ticketTypes: true },
      orderBy: { startDateTime: 'desc' },
      take: 50,
    });
    const sums = await this.prisma.order.groupBy({
      by: ['eventId'],
      where: { status: 'PAID', event: { organizerId: profile.id } },
      _sum: { totalAmount: true, organizerEarning: true },
    });
    const tickets = await this.prisma.ticket.groupBy({
      by: ['ticketTypeId'],
      where: { order: { status: 'PAID', event: { organizerId: profile.id } }, status: { in: ['ACTIVE', 'USED'] } },
      _count: { _all: true },
    });
    const soldByTier = new Map(tickets.map((t) => [t.ticketTypeId, t._count._all]));

    return events.map((e) => {
      const capacity = e.ticketTypes.reduce((n, t) => n + t.quantity, 0);
      const sold = e.ticketTypes.reduce((n, t) => n + (soldByTier.get(t.id) ?? 0), 0);
      const sum = sums.find((s) => s.eventId === e.id);
      const daysToStart = (e.startDateTime.getTime() - now.getTime()) / DAY;
      const sellThrough = capacity ? sold / capacity : 0;
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        startDateTime: e.startDateTime,
        ticketsSold: sold,
        capacity,
        sellThrough,
        grossSalesKes: Number(sum?._sum.totalAmount ?? 0),
        organizerEarningsKes: Number(sum?._sum.organizerEarning ?? 0),
        lowSales: e.status === 'PUBLISHED' && daysToStart > 0 && daysToStart <= 14 && sellThrough < 0.25,
      };
    });
  }
}
