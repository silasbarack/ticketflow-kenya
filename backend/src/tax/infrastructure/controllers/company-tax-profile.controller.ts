import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../common/decorators/current-user.decorator";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { CompanyTaxProfileService } from "../repositories/company-tax-profile.service";
import { UpdateCompanyTaxProfileDto } from "../dto/update-company-tax-profile.dto";

@Controller("admin/tax/company-profile")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class CompanyTaxProfileController {
  constructor(private companyTaxProfile: CompanyTaxProfileService) {}

  @Get()
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  get() {
    return this.companyTaxProfile.get();
  }

  @Patch()
  @RequireTaxPermission("ORGANIZER_TAX_CONFIGURE")
  update(
    @Body() dto: UpdateCompanyTaxProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companyTaxProfile.update(dto, user.userId);
  }
}
