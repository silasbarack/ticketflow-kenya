import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiAdminController } from './ai-admin.controller';
import { AiPublicController } from './ai-public.controller';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { UnconfiguredProvider } from './providers/unconfigured.provider';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * Provider selection lives here and only here. To add another vendor, write a
 * class implementing AiProvider and branch on AI_PROVIDER below; no feature
 * code changes.
 */
@Global()
@Module({
  imports: [AuditLogsModule],
  controllers: [AiAdminController, AiPublicController],
  providers: [
    AnthropicProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, AnthropicProvider],
      useFactory: (config: ConfigService, anthropic: AnthropicProvider) => {
        const name = (config.get<string>('AI_PROVIDER') || 'anthropic').toLowerCase();
        return name === 'anthropic' ? anthropic : new UnconfiguredProvider();
      },
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
