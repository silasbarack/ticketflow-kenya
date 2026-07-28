import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { TaxEncryptionService } from "./domain/crypto/tax-encryption.service";

import { TaxRuleRepository } from "./infrastructure/repositories/tax-rule.repository";
import { TaxAuditService } from "./infrastructure/repositories/tax-audit.service";
import { TaxPermissionRepository } from "./infrastructure/repositories/tax-permission.repository";
import { CompanyTaxProfileService } from "./infrastructure/repositories/company-tax-profile.service";
import { OrganizerTaxProfileService } from "./infrastructure/repositories/organizer-tax-profile.service";
import { LedgerRepository } from "./infrastructure/repositories/ledger.repository";
import { TaxPeriodService } from "./infrastructure/repositories/tax-period.service";
import { TaxAdjustmentService } from "./infrastructure/repositories/tax-adjustment.service";
import { TaxLiabilityService } from "./infrastructure/repositories/tax-liability.service";
import { TaxPrnService } from "./infrastructure/repositories/tax-prn.service";

import { TaxPermissionGuard } from "./infrastructure/guards/tax-permission.guard";

import { TicketSaleLedgerPostingService } from "./application/post-ticket-sale-ledger-entries.service";
import { RefundLedgerPostingService } from "./application/post-refund-ledger-entries.service";
import { CalculateTicketSaleTaxService } from "./application/calculate-ticket-sale-tax.service";
import { CalculateRefundTaxService } from "./application/calculate-refund-tax.service";
import { TaxRemittanceService } from "./application/tax-remittance.service";
import { EtimsDocumentService } from "./application/etims-document.service";
import { ReconciliationService } from "./application/reconciliation.service";
import { TaxNotificationService } from "./application/tax-notification.service";

import { MockKraPaymentAdapter } from "./integrations/kra-payment/mock-kra-payment.adapter";
import { ManualPrnPaymentAdapter } from "./integrations/kra-payment/prn-based-payment.adapter";
import { ApprovedTreasuryPaymentAdapter } from "./integrations/treasury/approved-treasury-payment.adapter";
import { MockTreasuryAdapter } from "./integrations/treasury/mock-treasury.adapter";
import { EtimsSandboxAdapter } from "./integrations/etims/etims-sandbox.adapter";
import { EtimsProductionAdapter } from "./integrations/etims/etims-production.adapter";

import { TaxJobsService } from "./infrastructure/jobs/tax-jobs.service";

import { TaxCalculationsController } from "./infrastructure/controllers/tax-calculations.controller";
import { RefundCalculationsController } from "./infrastructure/controllers/refund-calculations.controller";
import { TaxPeriodsController } from "./infrastructure/controllers/tax-periods.controller";
import { TaxLiabilitiesController } from "./infrastructure/controllers/tax-liabilities.controller";
import { TaxRemittancesController } from "./infrastructure/controllers/tax-remittances.controller";
import { EtimsController } from "./infrastructure/controllers/etims.controller";
import { AdminOrganizerTaxProfileController } from "./infrastructure/controllers/admin-organizer-tax-profile.controller";
import { CompanyTaxProfileController } from "./infrastructure/controllers/company-tax-profile.controller";
import { TaxRulesController } from "./infrastructure/controllers/tax-rules.controller";
import { ReconciliationController } from "./infrastructure/controllers/reconciliation.controller";
import { TaxAuditController } from "./infrastructure/controllers/tax-audit.controller";
import { TaxPermissionsController } from "./infrastructure/controllers/tax-permissions.controller";

/**
 * TicketFlow Kenya tax-compliance module. Self-contained: it reads
 * PrismaService (globally provided) and nothing else from the rest of the
 * app, and no existing module imports from here — see
 * docs/ticketflow-tax-architecture.md for the module boundary and why
 * tax_* tables are not modelled as Prisma relations to pre-existing
 * models.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [
    TaxCalculationsController,
    RefundCalculationsController,
    TaxPeriodsController,
    TaxLiabilitiesController,
    TaxRemittancesController,
    EtimsController,
    AdminOrganizerTaxProfileController,
    CompanyTaxProfileController,
    TaxRulesController,
    ReconciliationController,
    TaxAuditController,
    TaxPermissionsController,
  ],
  providers: [
    TaxEncryptionService,
    TaxRuleRepository,
    TaxAuditService,
    TaxPermissionRepository,
    TaxPermissionGuard,
    CompanyTaxProfileService,
    OrganizerTaxProfileService,
    LedgerRepository,
    TaxPeriodService,
    TaxAdjustmentService,
    TaxLiabilityService,
    TaxPrnService,
    TicketSaleLedgerPostingService,
    RefundLedgerPostingService,
    CalculateTicketSaleTaxService,
    CalculateRefundTaxService,
    TaxRemittanceService,
    EtimsDocumentService,
    ReconciliationService,
    TaxNotificationService,
    MockKraPaymentAdapter,
    ManualPrnPaymentAdapter,
    ApprovedTreasuryPaymentAdapter,
    MockTreasuryAdapter,
    EtimsSandboxAdapter,
    EtimsProductionAdapter,
    TaxJobsService,
  ],
  exports: [
    CalculateTicketSaleTaxService,
    CalculateRefundTaxService,
    TaxRuleRepository,
    TaxEncryptionService,
  ],
})
export class TaxModule {}
