import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { AiProvider, AiProviderError, AiProviderResult, AiStructuredRequest } from './ai-provider.interface';

const DEFAULT_MODEL = 'claude-opus-5-5';

/**
 * Claude via the official SDK. The API key is read server-side only; nothing
 * here is reachable from the browser.
 *
 * - Structured output: `output_config.format` with a Zod schema, so the model
 *   is constrained to the schema and the SDK parses the result.
 * - Refusals: `fallbacks: "default"` lets the API retry a policy decline on a
 *   suitable model inside the same call; a final `refusal` is reported back.
 * - Retries: the SDK retries 408/409/429/5xx and connection errors with
 *   exponential backoff (`maxRetries`).
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  get model(): string {
    return this.config.get<string>('AI_MODEL') || DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('ANTHROPIC_API_KEY'));
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
        maxRetries: parseInt(this.config.get<string>('AI_MAX_RETRIES') || '2', 10),
        timeout: parseInt(this.config.get<string>('AI_TIMEOUT_MS') || '60000', 10),
      });
    }
    return this.client;
  }

  async generateStructured<T>(request: AiStructuredRequest<T>): Promise<AiProviderResult> {
    if (!this.isConfigured()) {
      throw new AiProviderError('ANTHROPIC_API_KEY is not set', 'NOT_CONFIGURED', false);
    }

    try {
      const response = await this.getClient().beta.messages.parse({
        model: this.model,
        max_tokens: request.maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
        output_config: {
          format: betaZodOutputFormat(request.schema as any),
          effort: request.effort ?? 'low',
        },
      });

      return {
        output: response.stop_reason === 'refusal' ? null : (response.parsed_output ?? null),
        model: response.model || this.model,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        refused: response.stop_reason === 'refusal',
      };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new AiProviderError('AI provider rate limit reached', 'RATE_LIMITED', true);
      }
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        this.logger.error('AI provider rejected the API key');
        throw new AiProviderError('AI provider authentication failed', 'AUTH_FAILED', false);
      }
      if (error instanceof Anthropic.BadRequestError) {
        this.logger.error(`AI provider rejected the request: ${error.message}`);
        throw new AiProviderError('AI provider rejected the request', 'BAD_REQUEST', false);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new AiProviderError('AI provider could not be reached', 'UNREACHABLE', true);
      }
      if (error instanceof Anthropic.APIError) {
        throw new AiProviderError(`AI provider error ${error.status ?? ''}`.trim(), 'PROVIDER_ERROR', true);
      }
      // A parse failure inside the SDK (output not matching the schema).
      throw new AiProviderError((error as Error)?.message || 'AI provider failure', 'INVALID_OUTPUT', false);
    }
  }
}
