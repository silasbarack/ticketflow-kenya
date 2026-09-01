import type { Feather } from '@expo/vector-icons';

/** Slugs mirror the website routes under `/legal/*` so the two stay in step. */
export type LegalSlug =
  | 'privacy-policy'
  | 'mobile-privacy-policy'
  | 'terms-and-conditions'
  | 'payment-policy'
  | 'ticket-purchase-policy'
  | 'event-organizer-policy'
  | 'cookie-policy';

/**
 * Inline markup supported inside every `text` / `items` string below:
 *
 * - `**bold**` — renders bold, used for defined terms and emphasis.
 * - `[label](slug)` — cross-reference to another policy; tapping it navigates
 *   to that document in-app instead of opening the website.
 */
export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'steps'; items: string[] };

export interface LegalDocument {
  slug: LegalSlug;
  /** Full legal title, as shown on the website. */
  title: string;
  /** Condensed title for menu rows and the stack header. */
  shortTitle: string;
  icon: keyof typeof Feather.glyphMap;
  effectiveDate: string;
  /** One-line description shown in the profile menu. */
  summary: string;
  /**
   * `'draft'` marks a document that is visible in the app but not yet in force,
   * so the screen can say so plainly. Omit once the text is final and
   * `effectiveDate` is set.
   */
  status?: 'draft';
  blocks: LegalBlock[];
}
