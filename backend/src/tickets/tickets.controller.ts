import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('tickets')
@UseGuards(RolesGuard)
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findMine(user.userId);
  }

  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.ticketsService.findByCode(code);
  }

  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findOne(user.userId, user.role, id);
  }
}
