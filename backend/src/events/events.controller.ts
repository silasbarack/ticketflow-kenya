import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.userId, dto);
  }

  @Public()
  @Get()
  findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findPublic(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Get('organizer/mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.findAllForOrganizer(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Get('organizer/:id')
  findOneForOrganizer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.findOneForOrganizer(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Get(':id/attendees')
  getAttendees(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.getAttendees(user.userId, id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOnePublic(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(user.userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.remove(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Patch(':id/submit-for-approval')
  submitForApproval(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.submitForApproval(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.cancel(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/publish')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.publish(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.eventsService.reject(user.userId, id, reason);
  }
}
