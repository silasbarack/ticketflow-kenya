import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { EventsService } from '../events/events.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private eventsService: EventsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('role') role?: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.adminService.getAllUsers({
      role,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id, false);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id, true);
  }

  @Get('events')
  getEvents(@Query('status') status?: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.adminService.getAllEvents({
      status,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Patch('events/:id/approve')
  approveEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.publish(user.userId, id);
  }

  @Patch('events/:id/reject')
  rejectEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.eventsService.reject(user.userId, id, reason);
  }

  @Patch('events/:id/suspend')
  suspendEvent(@Param('id') id: string) {
    return this.adminService.suspendEvent(id);
  }

  @Get('payments')
  getPayments(@Query('status') status?: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.adminService.getAllPayments({
      status,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }
}
