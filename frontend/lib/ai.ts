import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';

/** Mirrors backend/src/ai/ai-features.ts. */
export type AiFeature =
  | 'EVENT_ASSISTANT'
  | 'MARKETING_STUDIO'
  | 'SUPPORT_CHAT'
  | 'SALES_INSIGHTS'
  | 'ANOMALY_EXPLAINER'
  | 'ADMIN_COPILOT';

export type AiAvailability = Record<AiFeature, boolean>;

/** Which AI features the backend will currently serve (global switch + admin toggles). */
export function useAiAvailability(enabled = true) {
  return useQuery({
    queryKey: ['ai-availability'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => (await api.get<AiAvailability>('/ai/availability')).data,
  });
}

/** Turns an AI endpoint failure into copy that tells the user what to do next. */
export function aiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[]; reason?: string } | undefined;
    const message = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
    if (message) return message;
    if (!error.response) return 'Could not reach TicketFlow. Check your connection and try again.';
  }
  return 'The AI assistant is unavailable right now. You can continue without it.';
}

export interface DraftBase<TOutput> {
  id: string;
  feature: AiFeature;
  ownerId: string;
  eventId: string | null;
  status: 'DRAFT' | 'ACCEPTED' | 'DISCARDED';
  language: string | null;
  output: TOutput & { warnings: string[]; model?: string; edited?: boolean };
  decidedAt?: string | null;
  createdAt: string;
}

export interface EventCopy {
  description: string;
  summary: string;
  agenda: { label: string; title: string; detail: string }[];
  faqs: { question: string; answer: string }[];
  seo: { title: string; metaDescription: string; keywords: string[] };
  ticketTierNames: { name: string; category: string; rationale: string }[];
  headlines: string[];
}

export type EventAssistantDraft = DraftBase<{ en: EventCopy; sw: EventCopy | null; assumptions: string[] }>;

export type MarketingChannel = 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'EMAIL' | 'SEO' | 'CTA';

export const MARKETING_CHANNELS: { value: MarketingChannel; label: string }[] = [
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WHATSAPP', label: 'WhatsApp Business' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SEO', label: 'SEO title & meta' },
  { value: 'CTA', label: 'Call-to-action lines' },
];

export type MarketingDraft = DraftBase<{
  pieces: { channel: MarketingChannel; language: 'en' | 'sw'; title: string; body: string; hashtags: string[] }[];
  campaignIdeas: { title: string; detail: string; timing: string }[];
  delivery: { automated: false; note: string };
}>;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
