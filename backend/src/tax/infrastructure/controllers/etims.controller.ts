import {
  BadRequestException,
  Controller,
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
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPermissionGuard } from "../guards/tax-permission.guard";
import { RequireTaxPermission } from "../guards/tax-permission.decorator";
import { EtimsDocumentService } from "../../application/etims-document.service";
import { CalculateTicketSaleTaxService } from "../../application/calculate-ticket-sale-tax.service";
import { TaxEncryptionService } from "../../domain/crypto/tax-encryption.service";
import { mapTicketSaleToEtimsInvoiceRequest } from "../../integrations/etims/etims-invoice.mapper";
import { mapRefundToEtimsCreditNoteRequest } from "../../integrations/etims/etims-credit-note.mapper";
import { rowToRefundCalculation } from "../serializers/refund-tax.mapper";

@Controller("admin/etims")
@UseGuards(RolesGuard, TaxPermissionGuard)
@Roles(Role.ADMIN)
export class EtimsController {
  constructor(
    private prisma: PrismaService,
    private etims: EtimsDocumentService,
    private calculations: CalculateTicketSaleTaxService,
    private encryption: TaxEncryptionService,
  ) {}

  @Post("invoices/:orderId/submit")
  @RequireTaxPermission("ETIMS_RETRY")
  async submitInvoice(
    @Param("orderId") orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    const calcRow = await this.prisma.taxCalculation.findFirst({
      where: { orderId, isActive: true },
    });
    if (!calcRow)
      throw new BadRequestException(
        "No active tax calculation exists for this order yet — calculate tax before submitting to eTIMS",
      );
    const calculation = await this.calculations.findById(calcRow.id);
    if (!calculation) throw new NotFoundException("Tax calculation not found");

    const company = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    if (!company?.kraPinEncrypted) {
      throw new BadRequestException(
        "TicketFlow KRA PIN is not configured on the company tax profile",
      );
    }

    const request = mapTicketSaleToEtimsInvoiceRequest(
      {
        calculation,
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        sellerLegalName: company.legalName,
        sellerKraPin: this.encryption.decrypt(company.kraPinEncrypted),
        invoiceDateTime: new Date().toISOString(),
      },
      `ETIMS-INVOICE:${calcRow.id}`,
      `ETIMS-INVOICE:${calcRow.id}`,
    );

    return this.etims.submitInvoice(orderId, calcRow.id, request, user.userId);
  }

  @Post("credit-notes/:refundId/submit")
  @RequireTaxPermission("ETIMS_RETRY")
  async submitCreditNote(
    @Param("refundId") refundId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const refundRow = await this.prisma.refundTaxCalculation.findUnique({
      where: { refundId },
    });
    if (!refundRow)
      throw new NotFoundException(
        "Refund tax calculation not found — calculate the refund before submitting a credit note",
      );
    const refundCalculation = rowToRefundCalculation(refundRow);

    const order = await this.prisma.order.findUnique({
      where: { id: refundRow.orderId },
      include: { event: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    const originalInvoice = await this.prisma.etimsDocument.findFirst({
      where: { orderId: refundRow.orderId, documentType: "INVOICE" },
    });
    if (!originalInvoice) {
      throw new BadRequestException(
        "Cannot submit a credit note before the original eTIMS invoice has been submitted for this order",
      );
    }

    const company = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    if (!company?.kraPinEncrypted) {
      throw new BadRequestException(
        "TicketFlow KRA PIN is not configured on the company tax profile",
      );
    }

    const request = mapRefundToEtimsCreditNoteRequest(
      {
        refundCalculation,
        orderNumber: order.orderNumber,
        eventTitle: order.event.title,
        originalInvoiceExternalReference: originalInvoice.externalReference,
        sellerLegalName: company.legalName,
        sellerKraPin: this.encryption.decrypt(company.kraPinEncrypted),
        creditNoteDateTime: new Date().toISOString(),
      },
      `ETIMS-CREDIT-NOTE:${refundRow.id}`,
      `ETIMS-CREDIT-NOTE:${refundRow.id}`,
    );

    return this.etims.submitCreditNote(
      refundId,
      refundRow.id,
      request,
      user.userId,
    );
  }

  @Post("documents/:id/retry")
  @RequireTaxPermission("ETIMS_RETRY")
  retry(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.etims.retry(id, user.userId);
  }
}
