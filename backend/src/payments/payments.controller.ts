import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @Post('mpesa/stk-push')
  initiateStkPush(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiateStkPushDto) {
    return this.paymentsService.initiateStkPush(user.userId, dto);
  }

  // Public webhook — Safaricom calls this directly, so it cannot carry our JWT.
  @Public()
  @Post('mpesa/callback')
  handleCallback(@Body() body: any) {
    return this.paymentsService.handleMpesaCallback(body);
  }

  // DEVELOPMENT ONLY: simulates a successful payment without a real M-Pesa callback.
  @Public()
  @Post('mock/:paymentId/success')
  mockSuccess(@Param('paymentId') paymentId: string) {
    return this.paymentsService.mockMarkSuccess(paymentId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get('order/:orderId')
  findByOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(user.userId, user.role, orderId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentsService.findById(user.userId, user.role, id);
  }
}
