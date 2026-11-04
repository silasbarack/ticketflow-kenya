import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { DiscoveryService } from './discovery.service';

class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  personalizationConsent?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  preferredCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  preferredCities?: string[];
}

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  /** Non-personalised: popularity, timing and featured status only. */
  @Public()
  @Get('recommendations')
  recommendations(@Query('limit') limit?: string) {
    return this.discovery.recommend(null, parseInt(limit || '8', 10) || 8);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('me/recommendations')
  mine(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.discovery.recommend(user.userId, parseInt(limit || '8', 10) || 8);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('me/preferences')
  preferences(@CurrentUser() user: AuthenticatedUser) {
    return this.discovery.getPreferences(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Put('me/preferences')
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePreferencesDto) {
    return this.discovery.updatePreferences(user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Post('me/views/:eventId')
  view(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.discovery.recordView(user.userId, eventId);
  }
}
