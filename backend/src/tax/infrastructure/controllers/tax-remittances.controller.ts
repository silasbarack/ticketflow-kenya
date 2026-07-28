import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../common/decorators/current-user.decorator";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { TaxRemittanceService } from "../../application/tax-remittance.service";
import { RecordPaymentConfirmationDto } from "../dto/record-payment-confirmation.dto";

@Controller("admin/tax/remittances")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxRemittancesController {
  constructor(private remittance: TaxRemittanceService) {}

  @Post(":id/confirm")
  @RequireTaxPermission("TAX_PAYMENT_CONFIRM")
  confirm(
    @Param("id") id: string,
    @Body() dto: RecordPaymentConfirmationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.remittance.recordExternalConfirmation(id, dto, user.userId);
  }

  @Post(":id/second-approve")
  @RequireTaxPermission("TAX_PAYMENT_CONFIRM")
  secondApprove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.remittance.confirmBySecondApprover(id, user.userId);
  }

  @Get(":id")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  findOne(@Param("id") id: string) {
    return this.remittance.findById(id);
  }
}
