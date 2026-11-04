import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const DAY = 86_400_000;

export interface ScoredEvent {
  id: string;
  score: number;
  reasons: string[];
}

interface Candidate {
  id: string;
  categoryId: string;
  city: string;
  startDateTime: Date;
  isFeatured: boolean;
  sold: number;
  capacity: number;
}

interface Signals {
  categoryWeights: Map<string, number>;
  cityWeights: Map<string, number>;
  viewedEventIds: Set<string>;
  purchasedEventIds: Set<string>;
  explicitCategories: Set<string>;
  explicitCities: Set<string>;
}

/**
 * Transparent scoring, no model involved: every recommendation comes with the
 * reasons that produced it. Popularity and timing work for everyone; personal
 * signals only apply when the user has given consent (or set explicit
 * preferences, which are themselves a choice they made).
 */
export function scoreEvents(candidates: Candidate[], signals: Signals | null, now: Date): ScoredEvent[] {
  const maxSold = Math.max(1, ...candidates.map((c) => c.sold));
  return candidates
    .map((c) => {
      const reasons: string[] = [];
      let score = 0;

      const popularity = c.sold / maxSold;
      score += popularity * 2;
      if (popularity > 0.6) reasons.push('Popular right now');

      const days = (c.startDateTime.getTime() - now.getTime()) / DAY;
      const soon = days <= 14 ? 1.5 : days <= 45 ? 1 : 0.4;
      score += soon;
      if (days <= 14) reasons.push('Happening soon');

      if (c.isFeatured) {
        score += 0.5;
        reasons.push('Featured');
      }
      if (c.capacity > 0 && c.sold / c.capacity > 0.85) reasons.push('Selling fast');

      if (signals) {
        if (signals.explicitCategories.has(c.categoryId)) {
          score += 3;
          reasons.push('Matches a category you follow');
        } else if (signals.categoryWeights.get(c.categoryId)) {
          score += Math.min(signals.categoryWeights.get(c.categoryId)!, 3);
          reasons.push('Similar to events you liked');
        }
        const cityKey = c.city.toLowerCase();
        if (signals.explicitCities.has(cityKey)) {
          score += 2;
          reasons.push(`In ${c.city}`);
        } else if (signals.cityWeights.get(cityKey)) {
          score += Math.min(signals.cityWeights.get(cityKey)!, 1.5);
        }
        if (signals.purchasedEventIds.has(c.id)) score -= 5; // already going
        if (signals.viewedEventIds.has(c.id)) score += 0.3;
      }

      return { id: c.id, score: Math.round(score * 100) / 100, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score);
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
    return prefs ?? { userId, personalizationConsent: false, preferredCategoryIds: [], preferredCities: [] };
  }

  async updatePreferences(userId: string, patch: { personalizationConsent?: boolean; preferredCategoryIds?: string[]; preferredCities?: string[] }) {
    const data = {
      ...(patch.personalizationConsent !== undefined ? { personalizationConsent: patch.personalizationConsent } : {}),
      ...(patch.preferredCategoryIds ? { preferredCategoryIds: patch.preferredCategoryIds.slice(0, 20) } : {}),
      ...(patch.preferredCities ? { preferredCities: patch.preferredCities.map((c) => c.trim()).filter(Boolean).slice(0, 10) } : {}),
    };
    const prefs = await this.prisma.userPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    // Withdrawing consent erases the behavioural history it allowed.
    if (patch.personalizationConsent === false) await this.prisma.eventView.deleteMany({ where: { userId } });
    return prefs;
  }

  /** Stored only with consent; otherwise a no-op. */
  async recordView(userId: string, eventId: string) {
    const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
    if (!prefs?.personalizationConsent) return { recorded: false };
    const exists = await this.prisma.event.count({ where: { id: eventId, status: 'PUBLISHED' } });
    if (!exists) return { recorded: false };
    await this.prisma.eventView.create({ data: { userId, eventId } });
    return { recorded: true };
  }

  async recommend(userId: string | null, limit = 8, now = new Date()) {
    // Only real, published, upcoming events are ever recommended.
    const events = await this.prisma.event.findMany({
      where: { status: 'PUBLISHED', startDateTime: { gt: now } },
      include: { ticketTypes: { select: { quantity: true, quantitySold: true, price: true } }, category: true },
      take: 300,
    });
    if (!events.length) return { personalized: false, items: [] };

    const candidates: Candidate[] = events.map((e) => ({
      id: e.id,
      categoryId: e.categoryId,
      city: e.city,
      startDateTime: e.startDateTime,
      isFeatured: e.isFeatured,
      sold: e.ticketTypes.reduce((n, t) => n + t.quantitySold, 0),
      capacity: e.ticketTypes.reduce((n, t) => n + t.quantity, 0),
    }));

    let signals: Signals | null = null;
    if (userId) {
      const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
      const explicitCategories = new Set(prefs?.preferredCategoryIds ?? []);
      const explicitCities = new Set((prefs?.preferredCities ?? []).map((c) => c.toLowerCase()));
      const consent = Boolean(prefs?.personalizationConsent);

      if (consent || explicitCategories.size || explicitCities.size) {
        const categoryWeights = new Map<string, number>();
        const cityWeights = new Map<string, number>();
        const viewedEventIds = new Set<string>();
        const purchasedEventIds = new Set<string>();

        if (consent) {
          const [views, orders] = await Promise.all([
            this.prisma.eventView.findMany({ where: { userId, viewedAt: { gt: new Date(now.getTime() - 90 * DAY) } }, take: 200 }),
            this.prisma.order.findMany({ where: { userId, status: 'PAID' }, include: { event: { select: { categoryId: true, city: true } } }, take: 50 }),
          ]);
          const viewedEvents = await this.prisma.event.findMany({
            where: { id: { in: [...new Set(views.map((v) => v.eventId))] } },
            select: { id: true, categoryId: true, city: true },
          });
          for (const e of viewedEvents) {
            viewedEventIds.add(e.id);
            categoryWeights.set(e.categoryId, (categoryWeights.get(e.categoryId) ?? 0) + 0.5);
            cityWeights.set(e.city.toLowerCase(), (cityWeights.get(e.city.toLowerCase()) ?? 0) + 0.25);
          }
          for (const o of orders) {
            purchasedEventIds.add(o.eventId);
            categoryWeights.set(o.event.categoryId, (categoryWeights.get(o.event.categoryId) ?? 0) + 1);
            cityWeights.set(o.event.city.toLowerCase(), (cityWeights.get(o.event.city.toLowerCase()) ?? 0) + 0.5);
          }
        }
        signals = { categoryWeights, cityWeights, viewedEventIds, purchasedEventIds, explicitCategories, explicitCities };
      }
    }

    const ranked = scoreEvents(candidates, signals, now).slice(0, Math.min(limit, 24));
    const byId = new Map(events.map((e) => [e.id, e]));
    return {
      personalized: Boolean(signals),
      items: ranked.map((r) => {
        const e = byId.get(r.id)!;
        return {
          id: e.id,
          title: e.title,
          posterUrl: e.posterUrl,
          posterAlt: e.posterAlt,
          venue: e.venue,
          city: e.city,
          startDateTime: e.startDateTime,
          category: { id: e.category.id, name: e.category.name, slug: e.category.slug },
          reasons: r.reasons,
          minPriceKes: e.ticketTypes.length ? Math.min(...e.ticketTypes.map((t) => Number(t.price))) : null,
        };
      }),
    };
  }
}
