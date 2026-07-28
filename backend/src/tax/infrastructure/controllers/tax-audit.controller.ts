import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { TaxAuditService } from "../repositories/tax-audit.service";

@Controller("admin/tax/audit-events")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxAuditController {
  constructor(private audit: TaxAuditService) {}

  @Get()
  @RequireTaxPermission("TAX_AUDIT_VIEW")
  list(
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.audit.findAll({
      entityType,
      entityId,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }
}
