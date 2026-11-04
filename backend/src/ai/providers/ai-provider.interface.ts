import { z } from 'zod';

/**
 * Provider-independent contract. A provider turns a system prompt + user
 * content into JSON matching a schema. AiService re-validates whatever comes
 * back, so a provider that cannot enforce schemas natively still plugs in.
 */
export interface AiStructuredRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /** Relative reasoning effort; providers map it to their own knob or ignore it. */
  effort?: 'low' | 'medium' | 'high';
}

export interface AiProviderResult {
  /** Parsed JSON, or null when the provider produced nothing usable. */
  output: unknown;
  /** The model that actually served the request (may differ after a fallback). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** True when the model declined the request on policy grounds. */
  refused: boolean;
}

export interface AiProvider {
  readonly name: string;
  /** Default model id requests are sent to. */
  readonly model: string;
  isConfigured(): boolean;
  generateStructured<T>(request: AiStructuredRequest<T>): Promise<AiProviderResult>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/** Raised for any provider-side failure (network, auth, 5xx, timeout). */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
