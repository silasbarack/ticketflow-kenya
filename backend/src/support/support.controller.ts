import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { AdminReplyDto, AdminUpdateSupportTicketDto, CreateSupportTicketDto, SupportChatDto, SupportFeedbackDto } from './support.dto';

/**
 * Signed-out visitors. A conversation is identified by its id plus the secret
 * access token returned when it was created (sent as `X-Support-Token`). These
 * routes never see account data.
 */
@Public()
@Controller('support')
export class SupportPublicController {
  constructor(private readonly support: SupportService) {}

  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Post('chat')
  chat(@Body() dto: SupportChatDto, @Headers('x-support-token') token?: string) {
    return this.support.chat({ message: dto.message, conversationId: dto.conversationId, accessToken: token });
  }

  @Get('conversations/:id')
  conversation(@Param('id') id: string, @Headers('x-support-token') token?: string) {
    return this.support.getConversation(id, { accessToken: token });
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('messages/:id/feedback')
  feedback(@Param('id') id: string, @Body() dto: SupportFeedbackDto, @Headers('x-support-token') token?: string) {
    return this.support.feedback(id, { accessToken: token }, dto.value, dto.note);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('tickets')
  ticket(@Body() dto: CreateSupportTicketDto, @Headers('x-support-token') token?: string) {
    return this.support.createTicket({ viewer: { accessToken: token }, ...dto, orderNumber: undefined });
  }
}

/** Signed-in users: answers can use their own orders, and history is kept. */
@UseGuards(RolesGuard)
@Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
@Controller('support/me')
export class SupportMeController {
  constructor(private readonly support: SupportService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('chat')
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: SupportChatDto) {
    return this.support.chat({ message: dto.message, conversationId: dto.conversationId, userId: user.userId });
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthenticatedUser) {
    return this.support.listMyConversations(user.userId);
  }

  @Get('conversations/:id')
  conversation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.getConversation(id, { userId: user.userId });
  }

  @Post('messages/:id/feedback')
  feedback(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SupportFeedbackDto) {
    return this.support.feedback(id, { userId: user.userId }, dto.value, dto.note);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('tickets')
  ticket(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupportTicketDto) {
    return this.support.createTicket({ viewer: { userId: user.userId }, ...dto });
  }

  @Get('tickets')
  tickets(@CurrentUser() user: AuthenticatedUser) {
    return this.support.listMyTickets(user.userId);
  }
}

@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/support')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('stats')
  stats() {
    return this.support.adminStats();
  }

  @Get('tickets')
  tickets(@Query('status') status?: string) {
    return this.support.adminListTickets(status);
  }

  @Patch('tickets/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminUpdateSupportTicketDto) {
    return this.support.adminUpdateTicket(id, user.userId, dto);
  }

  @Get('conversations')
  conversations(@Query('flagged') flagged?: string, @Query('negative') negative?: string) {
    return this.support.adminListConversations({ flagged: flagged === 'true', negative: negative === 'true' });
  }

  @Get('conversations/:id')
  conversation(@Param('id') id: string) {
    return this.support.adminGetConversation(id);
  }

  @Post('conversations/:id/reply')
  reply(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminReplyDto) {
    return this.support.adminReply(id, user.userId, dto.content);
  }
}
