import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ManualCheckinDto } from './dto/manual-checkin.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller()
@UseGuards(RolesGuard)
@Roles(Role.ORGANIZER)
export class CheckinsController {
  constructor(private checkinsService: CheckinsService) {}

  @Post('checkins/scan')
  scan(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScanTicketDto) {
    return this.checkinsService.scan(user.userId, dto);
  }

  @Post('checkins/manual')
  manual(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualCheckinDto) {
    return this.checkinsService.manual(user.userId, dto);
  }

  @Get('events/:eventId/checkins')
  findAllForEvent(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.checkinsService.findAllForEvent(user.userId, eventId);
  }
}
