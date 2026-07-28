import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../common/decorators/current-user.decorator";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { ReconciliationService } from "../../application/reconciliation.service";

@Controller("admin/tax/reconciliation")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class ReconciliationController {
  constructor(private reconciliation: ReconciliationService) {}

  @Post("daily/:date")
  @RequireTaxPermission("TAX_LIABILITY_RECONCILE")
  runDaily(
    @Param("date") date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliation.runDaily(date, user.userId);
  }

  @Get("exceptions")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  listExceptions(@Query("type") type?: string) {
    return this.reconciliation.listOpenExceptions({ type });
  }

  @Post("exceptions/:id/resolve")
  @RequireTaxPermission("TAX_LIABILITY_RECONCILE")
  resolve(
    @Param("id") id: string,
    @Body("note") note: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliation.resolveException(id, user.userId, note ?? "");
  }
}
