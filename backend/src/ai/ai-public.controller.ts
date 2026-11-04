import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai.service';
import { AI_FEATURE_LIST } from './ai-features';

/** Lets any signed-in client decide whether to show AI controls. */
@Controller('ai')
export class AiPublicController {
  constructor(private readonly ai: AiService) {}

  @Get('availability')
  async availability() {
    const entries = await Promise.all(AI_FEATURE_LIST.map(async (f) => [f, await this.ai.isFeatureAvailable(f)] as const));
    return Object.fromEntries(entries);
  }
}
