import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { TaxPeriodService } from "../repositories/tax-period.service";
import { TaxAdjustmentService } from "../repositories/tax-adjustment.service";
import { ReconciliationService } from "../../application/reconciliation.service";
import { CreateTaxAdjustmentDto } from "../dto/create-tax-adjustment.dto";
import { minorUnitsFromDecimalString } from "../../domain/money/money";

@Controller("admin/tax/periods")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxPeriodsController {
  constructor(
    private periods: TaxPeriodService,
    private adjustments: TaxAdjustmentService,
    private reconciliation: ReconciliationService,
  ) {}

  @Post(":period/aggregate")
  @RequireTaxPermission("TAX_PERIOD_PREPARE")
  aggregate(
    @Param("period") period: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periods.aggregate(period, user.userId);
  }

  @Post(":period/reconcile")
  @RequireTaxPermission("TAX_LIABILITY_RECONCILE")
  async reconcile(
    @Param("period") period: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const run = await this.reconciliation.runMonthly(period, user.userId);
    if (run.exceptions.every((e) => e.status !== "OPEN")) {
      await this.periods.markReconciled(period, user.userId);
    }
    return run;
  }

  @Get(":period/report")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  report(@Param("period") period: string) {
    return this.periods.report(period);
  }

  @Post(":period/adjustments")
  @RequireTaxPermission("TAX_PERIOD_PREPARE")
  async addAdjustment(
    @Param("period") period: string,
    @Body() dto: CreateTaxAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const taxPeriod = await this.periods.prepareDraft(period, user.userId);
    if (!dto.amount || Number.isNaN(Number(dto.amount)))
      throw new BadRequestException("amount is required");
    return this.adjustments.create(
      {
        periodId: taxPeriod.id,
        type: dto.type,
        category: dto.category,
        amountMinor: minorUnitsFromDecimalString(dto.amount),
        reason: dto.reason,
        evidenceRef: dto.evidenceRef,
      },
      user.userId,
    );
  }

  @Post("adjustments/:adjustmentId/approve")
  @RequireTaxPermission("TAX_LIABILITY_APPROVE")
  approveAdjustment(
    @Param("adjustmentId") adjustmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adjustments.approve(adjustmentId, user.userId);
  }
}
