import { Body, Controller, Get, Param, Patch, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { EventsService } from '../events/events.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { OrganizersService } from '../organizers/organizers.service';
import { ReviewOrganizerVerificationDto } from '../organizers/dto/organizer-verification.dto';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private eventsService: EventsService,
    private organizersService: OrganizersService,
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

  @Get('organizer-verifications')
  getOrganizerVerifications(@Query('status') status?: string) {
    return this.organizersService.listVerificationsForAdmin(status);
  }

  @Get('organizer-verifications/:id')
  getOrganizerVerification(@Param('id') id: string) {
    return this.organizersService.getVerificationForAdmin(id);
  }

  @Get('organizer-verifications/:id/documents/:kind/file')
  async getOrganizerVerificationDocument(@Param('id') id: string, @Param('kind') kind: string) {
    const document = await this.organizersService.getVerificationDocument(id, kind);
    return new StreamableFile(document.data, {
      type: document.mimeType,
      disposition: `inline; filename="${document.fileName.replace(/"/g, '')}"`,
      length: document.sizeBytes,
    });
  }

  @Patch('organizer-verifications/:id/under-review')
  markOrganizerVerificationUnderReview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.organizersService.markUnderReview(user.userId, id);
  }

  @Patch('organizer-verifications/:id/approve')
  approveOrganizerVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewOrganizerVerificationDto,
  ) {
    return this.organizersService.approveVerification(user.userId, id, dto.note);
  }

  @Patch('organizer-verifications/:id/request-changes')
  requestOrganizerVerificationChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewOrganizerVerificationDto,
  ) {
    return this.organizersService.requestVerificationChanges(user.userId, id, dto.note);
  }

  @Patch('organizer-verifications/:id/reject')
  rejectOrganizerVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewOrganizerVerificationDto,
  ) {
    return this.organizersService.rejectVerification(user.userId, id, dto.note);
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
