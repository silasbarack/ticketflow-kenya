import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { CalculateTicketSaleTaxService } from "../../application/calculate-ticket-sale-tax.service";
import { CalculateTicketSalePreviewDto } from "../dto/calculate-ticket-sale-preview.dto";
import { mapPreviewDtoToInput } from "../dto/dto-to-domain.mapper";
import { ticketSaleCalculationToApi } from "../serializers/tax-calculation.mapper";

@Controller("admin/tax/calculations")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class TaxCalculationsController {
  constructor(private calculateTicketSaleTax: CalculateTicketSaleTaxService) {}

  @Post("ticket-sale/preview")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  async preview(
    @Body() dto: CalculateTicketSalePreviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    void user;
    const input = mapPreviewDtoToInput(dto);
    const calculation = await this.calculateTicketSaleTax.preview(input);
    return ticketSaleCalculationToApi(calculation);
  }

  @Get(":id")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  async findOne(@Param("id") id: string) {
    const calculation = await this.calculateTicketSaleTax.findById(id);
    if (!calculation) throw new NotFoundException("Tax calculation not found");
    return ticketSaleCalculationToApi(calculation);
  }
}
