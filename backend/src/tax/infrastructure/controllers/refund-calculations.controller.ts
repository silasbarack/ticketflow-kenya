import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/roles.enum";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { CalculateRefundTaxService } from "../../application/calculate-refund-tax.service";
import { CalculateRefundTaxDto } from "../dto/calculate-refund-tax.dto";
import { mapRefundDtoToInput } from "../dto/dto-to-domain.mapper";
import { refundCalculationToApi } from "../serializers/refund-tax.mapper";

@Controller("admin/tax/calculations/refund")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class RefundCalculationsController {
  constructor(
    private prisma: PrismaService,
    private calculateRefundTax: CalculateRefundTaxService,
  ) {}

  @Post("preview")
  @RequireTaxPermission("TAX_CALCULATION_VIEW")
  async preview(@Body() dto: CalculateRefundTaxDto) {
    const ruleVersionIds = await this.resolveRuleVersionIds(dto);
    const input = mapRefundDtoToInput(dto);
    const calculation = await this.calculateRefundTax.preview(
      input,
      ruleVersionIds,
    );
    return refundCalculationToApi(calculation);
  }

  private async resolveRuleVersionIds(
    dto: CalculateRefundTaxDto,
  ): Promise<string[]> {
    if (dto.originalRuleVersionIds?.length) return dto.originalRuleVersionIds;
    const original = await this.prisma.taxCalculation.findUnique({
      where: { id: dto.originalCalculationId },
    });
    if (!original)
      throw new NotFoundException("Original tax calculation not found");
    return original.ruleVersionIds;
  }
}
