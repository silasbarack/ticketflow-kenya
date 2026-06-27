import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { UpdateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('organizers')
@UseGuards(RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizersController {
  constructor(private organizersService: OrganizersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.organizersService.getProfileByUserId(user.userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizerProfileDto) {
    return this.organizersService.updateProfile(user.userId, dto);
  }

  @Get('me/dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.organizersService.getDashboardStats(user.userId);
  }
}
