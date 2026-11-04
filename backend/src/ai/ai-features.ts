/**
 * Every AI-backed feature has a key here. Settings, limits and usage logs are
 * all keyed by these strings, and a feature that is not listed cannot call a
 * model at all.
 */
export const AI_FEATURES = {
  EVENT_ASSISTANT: 'EVENT_ASSISTANT',
  MARKETING_STUDIO: 'MARKETING_STUDIO',
  SUPPORT_CHAT: 'SUPPORT_CHAT',
  SALES_INSIGHTS: 'SALES_INSIGHTS',
  ANOMALY_EXPLAINER: 'ANOMALY_EXPLAINER',
  ADMIN_COPILOT: 'ADMIN_COPILOT',
} as const;

export type AiFeature = (typeof AI_FEATURES)[keyof typeof AI_FEATURES];

export const AI_FEATURE_LIST = Object.values(AI_FEATURES) as AiFeature[];

export const AI_FEATURE_INFO: Record<AiFeature, { label: string; description: string; audience: string }> = {
  EVENT_ASSISTANT: {
    label: 'AI Event Assistant',
    description: 'Drafts event descriptions, agendas, FAQs, SEO and tier names for organisers to review.',
    audience: 'Organisers',
  },
  MARKETING_STUDIO: {
    label: 'AI Marketing Studio',
    description: 'Drafts social, WhatsApp and email copy from real event details.',
    audience: 'Organisers',
  },
  SUPPORT_CHAT: {
    label: 'AI Support Chat',
    description: 'Answers customer questions from verified event and help-centre data.',
    audience: 'Everyone',
  },
  SALES_INSIGHTS: {
    label: 'AI Sales Insights',
    description: 'Explains trends in database-computed sales figures and suggests improvements.',
    audience: 'Organisers',
  },
  ANOMALY_EXPLAINER: {
    label: 'Anomaly Explainer',
    description: 'Writes readable summaries of payment and risk alerts. Never changes their status.',
    audience: 'Admins',
  },
  ADMIN_COPILOT: {
    label: 'Admin Operations Copilot',
    description: 'Daily and weekly operating summaries from platform metrics. Read-only.',
    audience: 'Admins',
  },
};

export function isAiFeature(value: string): value is AiFeature {
  return (AI_FEATURE_LIST as string[]).includes(value);
}
