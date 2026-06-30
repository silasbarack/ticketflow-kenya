import {
  Controller,
  Get,
  Header,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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

  /** Public ticket verification — used by organizer scanners and QR links. */
  @Public()
  @Get('verify/:ticketCode')
  verify(@Param('ticketCode') ticketCode: string) {
    return this.ticketsService.verifyTicket(ticketCode);
  }

  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.ticketsService.findByCode(code);
  }

  /** Stream the PDF ticket for download. */
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  downloadPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.ticketsService.streamPdf(user.userId, user.role, id);
  }

  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ticketsService.findOne(user.userId, user.role, id);
  }
}
