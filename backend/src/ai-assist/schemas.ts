import { z } from 'zod';

/**
 * Output contracts for organiser-facing AI. Deliberately missing: prices,
 * dates, capacities, publish flags. The model cannot propose them because the
 * schema has nowhere to put them.
 */

export const EventCopySchema = z.object({
  description: z.string().min(40).max(4000),
  summary: z.string().min(10).max(300),
  agenda: z
    .array(z.object({ label: z.string().max(40).describe('Relative slot such as "Doors open" or "Session 1" — never a clock time'), title: z.string().max(120), detail: z.string().max(300) }))
    .max(10),
  faqs: z.array(z.object({ question: z.string().max(200), answer: z.string().max(600) })).max(8),
  seo: z.object({
    title: z.string().max(70),
    metaDescription: z.string().max(170),
    keywords: z.array(z.string().max(40)).max(10),
  }),
  ticketTierNames: z
    .array(
      z.object({
        name: z.string().max(40),
        category: z.enum(['REGULAR', 'VIP', 'VVIP', 'STUDENT', 'EARLY_BIRD']),
        rationale: z.string().max(200),
      }),
    )
    .max(5),
  headlines: z.array(z.string().max(120)).max(5),
});

export const EventAssistantOutputSchema = z.object({
  en: EventCopySchema,
  sw: EventCopySchema.nullable().describe('Kiswahili version, or null if not requested'),
  assumptions: z.array(z.string().max(200)).max(6).describe('Anything you had to assume that the organiser should check'),
});
export type EventAssistantOutput = z.infer<typeof EventAssistantOutputSchema>;

export const MARKETING_CHANNELS = ['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'EMAIL', 'SEO', 'CTA'] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

const MarketingPieceSchema = z.object({
  channel: z.enum(MARKETING_CHANNELS),
  language: z.enum(['en', 'sw']),
  title: z.string().max(120).describe('Email subject, SEO title, or a short label for the post'),
  body: z.string().min(1).max(3000),
  hashtags: z.array(z.string().max(40)).max(12),
});

export const MarketingOutputSchema = z.object({
  pieces: z.array(MarketingPieceSchema).min(1).max(20),
  campaignIdeas: z
    .array(z.object({ title: z.string().max(100), detail: z.string().max(500), timing: z.string().max(100) }))
    .max(5),
});
export type MarketingOutput = z.infer<typeof MarketingOutputSchema>;

export const SalesNarrativeSchema = z.object({
  summary: z.string().min(1).max(1500),
  trends: z.array(z.string().max(300)).max(5),
  recommendations: z.array(z.object({ title: z.string().max(100), detail: z.string().max(400) })).max(5),
  caveats: z.array(z.string().max(300)).max(4),
});
export type SalesNarrative = z.infer<typeof SalesNarrativeSchema>;

export const OpsReportSchema = z.object({
  headline: z.string().max(200),
  summary: z.string().max(2000),
  highlights: z.array(z.string().max(300)).max(6),
  risks: z.array(z.string().max(300)).max(6),
  recommendedActions: z
    .array(z.object({ action: z.string().max(200), why: z.string().max(300), owner: z.enum(['ADMIN', 'SUPPORT', 'FINANCE', 'ENGINEERING']) }))
    .max(6),
});
export type OpsReport = z.infer<typeof OpsReportSchema>;

/**
 * Claims the organiser must double-check before using AI copy: anything that
 * reads like money, a discount, a sponsor or a named act that we did not give
 * the model. Shown as warnings on the draft — never silently rewritten.
 */
export function findRiskyClaims(text: string, facts: string): string[] {
  const warnings = new Set<string>();
  const factText = facts.toLowerCase();
  const lower = text.toLowerCase();

  for (const m of text.matchAll(/\b(?:kes|ksh|kshs|sh)\.?\s?[\d,]+/gi)) {
    const amount = m[0].replace(/[^\d]/g, '');
    if (amount && !factText.replace(/[^\d\s]/g, ' ').split(/\s+/).includes(amount)) {
      warnings.add(`Mentions an amount (${m[0].trim()}) that is not one of your ticket prices.`);
    }
  }
  if (/\b\d{1,2}\s?%|\bdiscount|\bpunguzo|\bpromo code|\bfree ticket|\bbogo\b|\bbuy one\b/.test(lower) && !/discount|%|promo/.test(factText)) {
    warnings.add('Mentions a discount or offer. TicketFlow has not recorded one for this event.');
  }
  if (/\bsponsor|\bpowered by|\bin partnership with|\bpresented by/.test(lower) && !/sponsor|partner|presented by|powered by/.test(factText)) {
    warnings.add('Mentions sponsors or partners. Confirm they are real and agreed before publishing.');
  }
  if (/\bfeaturing\b|\bheadlin|\blive performance by|\bspecial guest|\bperforming live\b|\bakishirikisha\b/.test(lower) && !/featuring|headlin|performer|guest|lineup|line-up|artist/.test(factText)) {
    warnings.add('Mentions performers or guests. Only name acts that are confirmed.');
  }
  if (/\b(1[0-2]|0?[1-9])(:[0-5]\d)?\s?(am|pm)\b|\b([01]?\d|2[0-3]):[0-5]\d\b/.test(lower)) {
    warnings.add('Contains clock times. Check them against your real schedule.');
  }
  return [...warnings];
}
