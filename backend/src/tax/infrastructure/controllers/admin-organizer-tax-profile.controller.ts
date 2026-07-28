import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../common/decorators/current-user.decorator";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { OrganizerTaxProfileService } from "../repositories/organizer-tax-profile.service";
import { UpdateOrganizerTaxProfileDto } from "../dto/update-organizer-tax-profile.dto";

@Controller("admin/organizers/:organizerId/tax-profile")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class AdminOrganizerTaxProfileController {
  constructor(private organizerTaxProfiles: OrganizerTaxProfileService) {}

  @Get()
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  get(@Param("organizerId") organizerId: string) {
    return this.organizerTaxProfiles.getByOrganizerId(organizerId);
  }

  @Patch()
  @RequireTaxPermission("ORGANIZER_TAX_CONFIGURE")
  update(
    @Param("organizerId") organizerId: string,
    @Body() dto: UpdateOrganizerTaxProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerTaxProfiles.update(organizerId, dto, user.userId);
  }
}
