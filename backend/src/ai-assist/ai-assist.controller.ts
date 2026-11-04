import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AI_FEATURES } from '../ai/ai-features';
import { AiAssistService } from './ai-assist.service';
import { AiDraftsService } from './ai-drafts.service';
import { SalesAnalyticsService } from './sales-analytics.service';
import { EditDraftDto, EventAssistantDto, MarketingDto, OpsReportDto } from './ai-assist.dto';
import { EventAssistantOutputSchema, MarketingOutputSchema } from './schemas';

const DRAFT_SCHEMAS = {
  [AI_FEATURES.EVENT_ASSISTANT]: EventAssistantOutputSchema.passthrough(),
  [AI_FEATURES.MARKETING_STUDIO]: MarketingOutputSchema.passthrough(),
} as const;

@UseGuards(RolesGuard)
@Controller('ai')
export class AiAssistController {
  constructor(
    private readonly assist: AiAssistService,
    private readonly drafts: AiDraftsService,
    private readonly analytics: SalesAnalyticsService,
  ) {}

  // ── Organiser drafts ─────────────────────────────────────────────────────

  @Roles(Role.ORGANIZER)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('event-assistant/drafts')
  eventDraft(@CurrentUser() user: AuthenticatedUser, @Body() dto: EventAssistantDto) {
    return this.assist.eventAssistant(user.userId, dto);
  }

  @Roles(Role.ORGANIZER)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('marketing/drafts')
  marketingDraft(@CurrentUser() user: AuthenticatedUser, @Body() dto: MarketingDto) {
    return this.assist.marketing(user.userId, dto);
  }

  @Roles(Role.ORGANIZER)
  @Get('drafts')
  listDrafts(@CurrentUser() user: AuthenticatedUser, @Query('feature') feature?: string, @Query('eventId') eventId?: string) {
    return this.drafts.list(user.userId, { feature, eventId });
  }

  @Roles(Role.ORGANIZER)
  @Patch('drafts/:id')
  async editDraft(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: EditDraftDto) {
    const draft = await this.drafts.getOwned(id, user.userId);
    const schema = DRAFT_SCHEMAS[draft.feature as keyof typeof DRAFT_SCHEMAS];
    if (!schema) throw new BadRequestException('This draft cannot be edited');
    return this.drafts.edit(id, user.userId, dto.output, schema);
  }

  @Roles(Role.ORGANIZER)
  @Post('drafts/:id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.drafts.decide(id, user.userId, 'ACCEPTED');
  }

  @Roles(Role.ORGANIZER)
  @Post('drafts/:id/discard')
  discard(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.drafts.decide(id, user.userId, 'DISCARDED');
  }

  // ── Sales insights (figures are deterministic; AI only explains) ─────────

  @Roles(Role.ORGANIZER)
  @Get('insights/overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.organizerOverview(user.userId);
  }

  @Roles(Role.ORGANIZER, Role.ADMIN)
  @Get('insights/events/:eventId')
  metrics(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.analytics.eventMetrics(eventId, user.userId, user.role);
  }

  @Roles(Role.ORGANIZER, Role.ADMIN)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('insights/events/:eventId/explain')
  explain(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.assist.explainSales(eventId, user.userId, user.role);
  }

  // ── Admin copilot (read-only) ────────────────────────────────────────────

  @Roles(Role.ADMIN)
  @Get('copilot/metrics')
  opsMetrics(@Query('period') period?: string) {
    return this.assist.opsMetrics(period === 'weekly' ? 'weekly' : 'daily');
  }

  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('copilot/report')
  opsReport(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpsReportDto) {
    return this.assist.opsReport(dto.period, user.userId);
  }
}
