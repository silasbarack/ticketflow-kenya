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
import { TaxLiabilityService } from "../repositories/tax-liability.service";
import { TaxPrnService } from "../repositories/tax-prn.service";
import { TaxRemittanceService } from "../../application/tax-remittance.service";
import {
  CreateTaxLiabilityDto,
  RejectTaxLiabilityDto,
} from "../dto/create-tax-liability.dto";
import { AttachPrnDto } from "../dto/attach-prn.dto";
import { minorUnitsFromDecimalString } from "../../domain/money/money";

@Controller("admin/tax/liabilities")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxLiabilitiesController {
  constructor(
    private liabilities: TaxLiabilityService,
    private prn: TaxPrnService,
    private remittance: TaxRemittanceService,
  ) {}

  @Get()
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  list(
    @Query("status") status?: string,
    @Query("owner") owner?: string,
    @Query("organizerId") organizerId?: string,
  ) {
    return this.liabilities.list({
      status: status as any,
      owner: owner as any,
      organizerId,
    });
  }

  @Post()
  @RequireTaxPermission("TAX_PERIOD_PREPARE")
  create(
    @Body() dto: CreateTaxLiabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.liabilities.create(
      {
        periodId: dto.periodId,
        taxHead: dto.taxHead,
        taxSubHead: dto.taxSubHead,
        owner: dto.owner,
        organizerId: dto.organizerId,
        amountMinor: minorUnitsFromDecimalString(dto.amount),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      user.userId,
    );
  }

  @Post(":id/reconcile")
  @RequireTaxPermission("TAX_LIABILITY_RECONCILE")
  reconcile(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.liabilities.reconcile(id, user.userId);
  }

  @Post(":id/approve")
  @RequireTaxPermission("TAX_LIABILITY_APPROVE")
  approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.liabilities.approve(id, user.userId);
  }

  @Post(":id/reject")
  @RequireTaxPermission("TAX_LIABILITY_APPROVE")
  reject(
    @Param("id") id: string,
    @Body() dto: RejectTaxLiabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.liabilities.reject(id, user.userId, dto.reason);
  }

  @Post(":id/prn")
  @RequireTaxPermission("TAX_PRN_ATTACH")
  attachPrn(
    @Param("id") id: string,
    @Body() dto: AttachPrnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prn.attach(
      {
        liabilityId: id,
        prn: dto.prn,
        taxpayerPin: dto.taxpayerPin,
        taxHead: dto.taxHead,
        taxSubHead: dto.taxSubHead,
        taxPeriod: dto.taxPeriod,
        amount: dto.amount,
        currency: dto.currency,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        source: dto.source,
      },
      user.userId,
    );
  }

  @Post("prn/:registrationId/verify")
  @RequireTaxPermission("TAX_PRN_ATTACH")
  verifyPrn(
    @Param("registrationId") registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prn.verify(registrationId, user.userId);
  }

  @Post(":id/pay")
  @RequireTaxPermission("TAX_PAYMENT_INITIATE")
  pay(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.remittance.initiate(id, user.userId);
  }
}
