import { AiProvider, AiProviderError, AiProviderResult } from './ai-provider.interface';

/** Used when AI_PROVIDER names nothing we know; every call fails closed. */
export class UnconfiguredProvider implements AiProvider {
  readonly name = 'none';
  readonly model = 'none';
  isConfigured() {
    return false;
  }
  async generateStructured(): Promise<AiProviderResult> {
    throw new AiProviderError('No AI provider configured', 'NOT_CONFIGURED', false);
  }
}
