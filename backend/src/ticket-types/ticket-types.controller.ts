import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller()
export class TicketTypesController {
  constructor(private ticketTypesService: TicketTypesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Post('events/:eventId/ticket-types')
  create(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string, @Body() dto: CreateTicketTypeDto) {
    return this.ticketTypesService.create(user.userId, eventId, dto);
  }

  @Public()
  @Get('events/:eventId/ticket-types')
  findAllForEvent(@Param('eventId') eventId: string) {
    return this.ticketTypesService.findAllForEvent(eventId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Patch('ticket-types/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTicketTypeDto) {
    return this.ticketTypesService.update(user.userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ORGANIZER)
  @Delete('ticket-types/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketTypesService.remove(user.userId, id);
  }
}
