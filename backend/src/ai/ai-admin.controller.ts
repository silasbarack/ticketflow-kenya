import { BadRequestException, Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AiService } from './ai.service';
import { isAiFeature } from './ai-features';
import { UpdateAiSettingDto } from './dto/update-ai-setting.dto';

@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/ai')
export class AiAdminController {
  constructor(
    private readonly ai: AiService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get('settings')
  settings() {
    return this.ai.listSettings();
  }

  @Patch('settings/:feature')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('feature') feature: string, @Body() dto: UpdateAiSettingDto) {
    if (!isAiFeature(feature)) throw new BadRequestException('Unknown AI feature');
    const { before, after } = await this.ai.updateSettings(feature, user.userId, dto);
    await this.audit.log({
      actorId: user.userId,
      action: 'AI_SETTINGS_UPDATED',
      entityType: 'AiFeatureSetting',
      entityId: feature,
      metadata: { before, after },
    });
    return after;
  }

  @Get('usage')
  usage(@Query('days') days?: string) {
    const n = Math.min(Math.max(parseInt(days || '30', 10) || 30, 1), 180);
    return this.ai.usageSummary(n);
  }
}
