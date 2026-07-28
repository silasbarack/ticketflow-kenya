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
import { TaxRuleRepository } from "../repositories/tax-rule.repository";
import { CreateTaxRuleDto } from "../dto/create-tax-rule.dto";
import { TaxRuleCode } from "../../domain/tax-rule/tax-rule.types";

@Controller("admin/tax/rules")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxRulesController {
  constructor(private taxRules: TaxRuleRepository) {}

  @Get()
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  list(@Query("code") code?: string) {
    return this.taxRules.list({ code: code as TaxRuleCode | undefined });
  }

  @Post()
  @RequireTaxPermission("ORGANIZER_TAX_CONFIGURE")
  create(
    @Body() dto: CreateTaxRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxRules.create({
      code: dto.code as TaxRuleCode,
      rateBps: dto.rateBps,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      roundingMode: dto.roundingMode,
      enabled: dto.enabled,
      sourceReference: dto.sourceReference,
      notes: dto.notes,
      createdBy: user.userId,
      requiresReview: true,
    });
  }

  @Post(":id/approve")
  @RequireTaxPermission("TAX_LIABILITY_APPROVE")
  approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.taxRules.approve(id, user.userId);
  }

  @Post(":id/disable")
  @RequireTaxPermission("ORGANIZER_TAX_CONFIGURE")
  disable(@Param("id") id: string) {
    return this.taxRules.disable(id);
  }
}
