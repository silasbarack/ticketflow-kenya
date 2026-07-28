-- CreateEnum
CREATE TYPE "TaxRuleCode" AS ENUM ('TICKETFLOW_PLATFORM_OUTPUT_VAT', 'ORGANIZER_TICKET_OUTPUT_VAT', 'CORPORATION_TAX_PROVISION', 'SUPPLIER_WITHHOLDING_TAX', 'PAYE', 'AFFORDABLE_HOUSING_LEVY', 'OTHER');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('HALF_UP', 'DOWN');

-- CreateEnum
CREATE TYPE "CompanyVatRegistrationStatus" AS ENUM ('REGISTERED', 'NOT_REGISTERED', 'PENDING');

-- CreateEnum
CREATE TYPE "OrganizerVatRegistrationStatus" AS ENUM ('REGISTERED', 'NOT_REGISTERED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AgencyModel" AS ENUM ('DISCLOSED_AGENT', 'PRINCIPAL_RESELLER');

-- CreateEnum
CREATE TYPE "EtimsMode" AS ENUM ('DISABLED', 'SANDBOX', 'OSCU', 'VSCU');

-- CreateEnum
CREATE TYPE "TaxPaymentMode" AS ENUM ('MANUAL_PRN', 'SANDBOX', 'APPROVED_BANK_INTEGRATION', 'APPROVED_MPESA_INTEGRATION');

-- CreateEnum
CREATE TYPE "EventSupplyTreatment" AS ENUM ('STANDARD_RATED', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "TicketPricingMode" AS ENUM ('VAT_INCLUSIVE', 'VAT_EXCLUSIVE');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('EVENT_CANCELLED', 'EVENT_POSTPONED', 'CUSTOMER_REQUEST', 'DUPLICATE_PAYMENT', 'FRAUD', 'CHARGEBACK', 'ADMIN_CORRECTION');

-- CreateEnum
CREATE TYPE "TaxPeriodStatus" AS ENUM ('DRAFT', 'PREPARED', 'RECONCILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxAdjustmentType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TaxLiabilityStatus" AS ENUM ('DRAFT', 'CALCULATED', 'RECONCILED', 'APPROVED', 'PRN_REQUIRED', 'PRN_ATTACHED', 'PAYMENT_PROCESSING', 'PAID', 'KRA_CONFIRMED', 'REJECTED', 'FAILED', 'CANCELLED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "LiabilityOwner" AS ENUM ('TICKETFLOW', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "PrnSource" AS ENUM ('MANUAL_ENTRY', 'FILE_UPLOAD', 'APPROVED_API');

-- CreateEnum
CREATE TYPE "PrnVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxRemittanceAdapter" AS ENUM ('MOCK', 'MANUAL_PRN', 'APPROVED_TREASURY');

-- CreateEnum
CREATE TYPE "TaxRemittanceStatus" AS ENUM ('PENDING', 'AWAITING_EXTERNAL_CONFIRMATION', 'SUBMITTED', 'REQUIRES_REVIEW', 'PAID', 'FAILED', 'SANDBOX_SIMULATED');

-- CreateEnum
CREATE TYPE "EtimsDocumentType" AS ENUM ('INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "EtimsDocumentStatus" AS ENUM ('PENDING_CONFIGURATION', 'PENDING_SUBMISSION', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'SANDBOX_SIMULATED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "ReconciliationRunType" AS ENUM ('DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReconciliationExceptionType" AS ENUM ('MISSING_ETIMS_INVOICE', 'DUPLICATE_ETIMS_INVOICE', 'AMOUNT_MISMATCH', 'VAT_MISMATCH', 'MISSING_CREDIT_NOTE', 'ORPHAN_PAYMENT', 'DUPLICATE_PAYMENT', 'PRN_MISMATCH', 'ORGANIZER_PIN_MISMATCH', 'UNBALANCED_LEDGER', 'MISSING_SETTLEMENT');

-- CreateEnum
CREATE TYPE "ReconciliationExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TaxPermission" AS ENUM ('TAX_CALCULATION_VIEW', 'TAX_PERIOD_PREPARE', 'TAX_LIABILITY_RECONCILE', 'TAX_LIABILITY_APPROVE', 'TAX_PRN_ATTACH', 'TAX_PAYMENT_INITIATE', 'TAX_PAYMENT_CONFIRM', 'TAX_PAYMENT_REVERSE', 'TAX_AUDIT_VIEW', 'ORGANIZER_TAX_CONFIGURE', 'ETIMS_RETRY');

-- CreateTable
CREATE TABLE "tax_company_profiles" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL,
    "kraPinEncrypted" TEXT,
    "vatRegistrationStatus" "CompanyVatRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "agencyModel" "AgencyModel" NOT NULL DEFAULT 'DISCLOSED_AGENT',
    "etimsMode" "EtimsMode" NOT NULL DEFAULT 'DISABLED',
    "taxPaymentMode" "TaxPaymentMode" NOT NULL DEFAULT 'MANUAL_PRN',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'KES',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_tax_profiles" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "kraPinEncrypted" TEXT,
    "vatRegistrationStatus" "OrganizerVatRegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "eventSupplyTreatment" "EventSupplyTreatment" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "ticketPricingMode" "TicketPricingMode" NOT NULL DEFAULT 'VAT_INCLUSIVE',
    "delegatedTaxPaymentAuthority" BOOLEAN NOT NULL DEFAULT false,
    "delegatedAuthorityDocumentId" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "code" "TaxRuleCode" NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'KE',
    "rateBps" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "roundingMode" "RoundingMode" NOT NULL DEFAULT 'HALF_UP',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "sourceReference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_calculations" (
    "id" TEXT NOT NULL,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "transactionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "agencyModel" "AgencyModel" NOT NULL,
    "ruleVersionIds" TEXT[],
    "customerPaymentMinor" BIGINT NOT NULL,
    "organizerTicketProceedsGrossMinor" BIGINT NOT NULL,
    "organizerTicketNetOfVatMinor" BIGINT,
    "organizerTicketOutputVatMinor" BIGINT,
    "bookingFeeGrossMinor" BIGINT NOT NULL,
    "bookingFeeNetMinor" BIGINT NOT NULL,
    "bookingFeeVatMinor" BIGINT NOT NULL,
    "commissionGrossMinor" BIGINT NOT NULL,
    "commissionNetMinor" BIGINT NOT NULL,
    "commissionVatMinor" BIGINT NOT NULL,
    "ticketFlowRevenueExVatMinor" BIGINT NOT NULL,
    "ticketFlowOutputVatMinor" BIGINT NOT NULL,
    "processorChargeMinor" BIGINT NOT NULL,
    "organizerSettlementBeforeRefundsMinor" BIGINT NOT NULL,
    "ticketFlowCashRetainedMinor" BIGINT NOT NULL,
    "components" JSONB NOT NULL,
    "warnings" TEXT[],
    "calculationHash" TEXT NOT NULL,
    "supersededByCalculationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_tax_calculations" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "originalCalculationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "refundableTicketFaceValueMinor" BIGINT NOT NULL,
    "refundableBookingFeeMinor" BIGINT NOT NULL,
    "nonRefundableFeeMinor" BIGINT NOT NULL,
    "ticketFlowRevenueReversalMinor" BIGINT NOT NULL,
    "ticketFlowVatReversalMinor" BIGINT NOT NULL,
    "organizerPayableReversalMinor" BIGINT NOT NULL,
    "organizerTicketVatReversalMinor" BIGINT,
    "processorChargeTreatment" TEXT NOT NULL,
    "organizerAlreadySettled" BOOLEAN NOT NULL,
    "ticketFlowRecoveryRequiredMinor" BIGINT NOT NULL DEFAULT 0,
    "refundReserveRequiredMinor" BIGINT NOT NULL DEFAULT 0,
    "requiresEtimsCreditNote" BOOLEAN NOT NULL DEFAULT true,
    "components" JSONB NOT NULL,
    "warnings" TEXT[],
    "calculationHash" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_ledger_accounts" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isOrganizerMemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_ledger_accounts_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "tax_journal_entries" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "reversalOfId" TEXT,
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "debitMinor" BIGINT NOT NULL DEFAULT 0,
    "creditMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "organizerId" TEXT,
    "memo" TEXT,

    CONSTRAINT "tax_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'KE',
    "status" "TaxPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "taxableRevenueExVatMinor" BIGINT NOT NULL DEFAULT 0,
    "outputVatMinor" BIGINT NOT NULL DEFAULT 0,
    "inputVatMinor" BIGINT NOT NULL DEFAULT 0,
    "withholdingVatCreditsMinor" BIGINT NOT NULL DEFAULT 0,
    "otherCreditsMinor" BIGINT NOT NULL DEFAULT 0,
    "creditNotesMinor" BIGINT NOT NULL DEFAULT 0,
    "debitNotesMinor" BIGINT NOT NULL DEFAULT 0,
    "netVatPayableMinor" BIGINT NOT NULL DEFAULT 0,
    "preparedBy" TEXT,
    "preparedAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_adjustments" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "type" "TaxAdjustmentType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceRef" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_liabilities" (
    "id" TEXT NOT NULL,
    "periodId" TEXT,
    "taxHead" TEXT NOT NULL,
    "taxSubHead" TEXT,
    "owner" "LiabilityOwner" NOT NULL DEFAULT 'TICKETFLOW',
    "organizerId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "TaxLiabilityStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" TEXT NOT NULL,
    "preparedBy" TEXT NOT NULL,
    "reconciledBy" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payment_registrations" (
    "id" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "taxpayerPinMasked" TEXT NOT NULL,
    "taxHead" TEXT NOT NULL,
    "taxSubHead" TEXT,
    "taxPeriod" TEXT NOT NULL,
    "prnEncrypted" TEXT NOT NULL,
    "prnHash" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "source" "PrnSource" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "verificationStatus" "PrnVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_payment_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_remittances" (
    "id" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "registrationId" TEXT,
    "adapter" "TaxRemittanceAdapter" NOT NULL,
    "status" "TaxRemittanceStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "idempotencyKey" TEXT NOT NULL,
    "bankReference" TEXT,
    "mpesaReference" TEXT,
    "kraConfirmationReference" TEXT,
    "evidenceFileRef" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresSecondApproval" BOOLEAN NOT NULL DEFAULT true,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_remittances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_etims_documents" (
    "id" TEXT NOT NULL,
    "documentType" "EtimsDocumentType" NOT NULL,
    "orderId" TEXT,
    "refundId" TEXT,
    "organizerId" TEXT,
    "mode" "EtimsMode" NOT NULL,
    "externalReference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EtimsDocumentStatus" NOT NULL DEFAULT 'PENDING_SUBMISSION',
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_etims_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_reconciliation_runs" (
    "id" TEXT NOT NULL,
    "type" "ReconciliationRunType" NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "summary" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_reconciliation_exceptions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "ReconciliationExceptionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "ReconciliationExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_reconciliation_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_audit_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "correlationId" TEXT NOT NULL,
    "requestId" TEXT,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_permission_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "TaxPermission" NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "tax_permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizer_tax_profiles_organizerId_key" ON "organizer_tax_profiles"("organizerId");

-- CreateIndex
CREATE INDEX "tax_rules_code_jurisdiction_enabled_idx" ON "tax_rules"("code", "jurisdiction", "enabled");

-- CreateIndex
CREATE INDEX "tax_calculations_orderId_idx" ON "tax_calculations"("orderId");

-- CreateIndex
CREATE INDEX "tax_calculations_organizerId_idx" ON "tax_calculations"("organizerId");

-- CreateIndex
CREATE INDEX "tax_calculations_eventId_idx" ON "tax_calculations"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_calculations_transactionId_calculationVersion_key" ON "tax_calculations"("transactionId", "calculationVersion");

-- CreateIndex
CREATE UNIQUE INDEX "refund_tax_calculations_refundId_key" ON "refund_tax_calculations"("refundId");

-- CreateIndex
CREATE INDEX "refund_tax_calculations_orderId_idx" ON "refund_tax_calculations"("orderId");

-- CreateIndex
CREATE INDEX "tax_journal_entries_sourceType_sourceId_idx" ON "tax_journal_entries"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "tax_journal_entries_correlationId_idx" ON "tax_journal_entries"("correlationId");

-- CreateIndex
CREATE INDEX "tax_journal_lines_journalEntryId_idx" ON "tax_journal_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "tax_journal_lines_accountCode_idx" ON "tax_journal_lines"("accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_period_key" ON "tax_periods"("period");

-- CreateIndex
CREATE UNIQUE INDEX "tax_liabilities_idempotencyKey_key" ON "tax_liabilities"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tax_liabilities_status_idx" ON "tax_liabilities"("status");

-- CreateIndex
CREATE INDEX "tax_liabilities_owner_organizerId_idx" ON "tax_liabilities"("owner", "organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_payment_registrations_prnHash_key" ON "tax_payment_registrations"("prnHash");

-- CreateIndex
CREATE INDEX "tax_payment_registrations_liabilityId_idx" ON "tax_payment_registrations"("liabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_remittances_idempotencyKey_key" ON "tax_remittances"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tax_remittances_liabilityId_idx" ON "tax_remittances"("liabilityId");

-- CreateIndex
CREATE INDEX "tax_remittances_status_idx" ON "tax_remittances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_etims_documents_externalReference_key" ON "tax_etims_documents"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "tax_etims_documents_idempotencyKey_key" ON "tax_etims_documents"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tax_etims_documents_status_nextAttemptAt_idx" ON "tax_etims_documents"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "tax_etims_documents_orderId_idx" ON "tax_etims_documents"("orderId");

-- CreateIndex
CREATE INDEX "tax_etims_documents_refundId_idx" ON "tax_etims_documents"("refundId");

-- CreateIndex
CREATE INDEX "tax_reconciliation_runs_type_scope_idx" ON "tax_reconciliation_runs"("type", "scope");

-- CreateIndex
CREATE INDEX "tax_reconciliation_exceptions_status_idx" ON "tax_reconciliation_exceptions"("status");

-- CreateIndex
CREATE INDEX "tax_reconciliation_exceptions_type_idx" ON "tax_reconciliation_exceptions"("type");

-- CreateIndex
CREATE INDEX "tax_audit_events_entityType_entityId_idx" ON "tax_audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "tax_audit_events_correlationId_idx" ON "tax_audit_events"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_permission_grants_userId_permission_key" ON "tax_permission_grants"("userId", "permission");

-- AddForeignKey
ALTER TABLE "tax_journal_lines" ADD CONSTRAINT "tax_journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "tax_journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_adjustments" ADD CONSTRAINT "tax_adjustments_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liabilities" ADD CONSTRAINT "tax_liabilities_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "tax_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payment_registrations" ADD CONSTRAINT "tax_payment_registrations_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "tax_liabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_remittances" ADD CONSTRAINT "tax_remittances_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "tax_liabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_remittances" ADD CONSTRAINT "tax_remittances_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "tax_payment_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_reconciliation_exceptions" ADD CONSTRAINT "tax_reconciliation_exceptions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "tax_reconciliation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Manually authored additions (not generated by `prisma migrate diff`).
-- These express constraints Prisma's schema DSL cannot express:
--   * FKs to pre-existing tables (User/Order/Event/OrganizerProfile/Ticket)
--     that we deliberately did not model as Prisma relations.
--   * Non-negative money CHECK constraints.
--   * A partial unique index ("only one PAID remittance per liability").
--   * A GiST exclusion constraint preventing overlapping effective-dated
--     tax rules for the same code+jurisdiction (defense-in-depth; the
--     authoritative check is application-level in TaxRuleRepository so
--     the error message stays user-friendly).
--   * Triggers making posted journal entries immutable and enforcing
--     debit == credit per journal entry at commit time.
-- =====================================================================

-- Needed for the GiST exclusion constraint on the tax-rule effective range.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---- Foreign keys to existing (pre-tax-module) tables ----------------
ALTER TABLE "tax_calculations"
  ADD CONSTRAINT "tax_calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tax_calculations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tax_calculations_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refund_tax_calculations"
  ADD CONSTRAINT "refund_tax_calculations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organizer_tax_profiles"
  ADD CONSTRAINT "organizer_tax_profiles_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_etims_documents"
  ADD CONSTRAINT "tax_etims_documents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---- Non-negative money guards ----------------------------------------
ALTER TABLE "tax_calculations"
  ADD CONSTRAINT "tax_calculations_amounts_nonneg" CHECK (
    "customerPaymentMinor" >= 0 AND "organizerTicketProceedsGrossMinor" >= 0 AND
    "bookingFeeGrossMinor" >= 0 AND "bookingFeeNetMinor" >= 0 AND "bookingFeeVatMinor" >= 0 AND
    "commissionGrossMinor" >= 0 AND "commissionNetMinor" >= 0 AND "commissionVatMinor" >= 0 AND
    "ticketFlowRevenueExVatMinor" >= 0 AND "ticketFlowOutputVatMinor" >= 0 AND
    "processorChargeMinor" >= 0
  );

ALTER TABLE "refund_tax_calculations"
  ADD CONSTRAINT "refund_tax_calculations_amounts_nonneg" CHECK (
    "refundableTicketFaceValueMinor" >= 0 AND "refundableBookingFeeMinor" >= 0 AND
    "nonRefundableFeeMinor" >= 0 AND "ticketFlowRevenueReversalMinor" >= 0 AND
    "ticketFlowVatReversalMinor" >= 0 AND "organizerPayableReversalMinor" >= 0 AND
    "ticketFlowRecoveryRequiredMinor" >= 0 AND "refundReserveRequiredMinor" >= 0
  );

ALTER TABLE "tax_liabilities" ADD CONSTRAINT "tax_liabilities_amount_nonneg" CHECK ("amountMinor" >= 0);
ALTER TABLE "tax_payment_registrations" ADD CONSTRAINT "tax_payment_registrations_amount_nonneg" CHECK ("amountMinor" >= 0);
ALTER TABLE "tax_remittances" ADD CONSTRAINT "tax_remittances_amount_nonneg" CHECK ("amountMinor" >= 0);
ALTER TABLE "tax_journal_lines" ADD CONSTRAINT "tax_journal_lines_amounts_nonneg" CHECK ("debitMinor" >= 0 AND "creditMinor" >= 0);

-- ---- Only one PAID remittance may exist per liability ------------------
CREATE UNIQUE INDEX "tax_remittances_one_paid_per_liability"
  ON "tax_remittances" ("liabilityId")
  WHERE "status" = 'PAID';

-- ---- No overlapping enabled effective-dated rules per code+jurisdiction
ALTER TABLE "tax_rules" ADD COLUMN "effective_range" tsrange
  GENERATED ALWAYS AS (tsrange("effectiveFrom", "effectiveTo", '[)')) STORED;

ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_no_overlap"
  EXCLUDE USING gist (
    "code" WITH =,
    "jurisdiction" WITH =,
    "effective_range" WITH &&
  ) WHERE ("enabled");

-- ---- Immutable posted journal entries / lines: corrections must use ----
-- ---- reversing entries (application-level), never UPDATE/DELETE. -------
CREATE OR REPLACE FUNCTION tax_journal_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'tax_journal_entries/tax_journal_lines are append-only; post a reversing entry instead (attempted % on %)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_journal_entries_no_update
  BEFORE UPDATE OR DELETE ON "tax_journal_entries"
  FOR EACH ROW EXECUTE FUNCTION tax_journal_immutable();

CREATE TRIGGER tax_journal_lines_no_update
  BEFORE UPDATE OR DELETE ON "tax_journal_lines"
  FOR EACH ROW EXECUTE FUNCTION tax_journal_immutable();

-- ---- Every posted journal entry must balance (sum(debit) = sum(credit))
-- Deferred so multi-row INSERTs within one transaction are checked once,
-- at COMMIT, after all lines for the entry have been inserted.
CREATE OR REPLACE FUNCTION tax_journal_entry_must_balance() RETURNS trigger AS $$
DECLARE
  entry_id text;
  imbalance bigint;
BEGIN
  entry_id := COALESCE(NEW."journalEntryId", OLD."journalEntryId");
  SELECT COALESCE(SUM("debitMinor"), 0) - COALESCE(SUM("creditMinor"), 0)
    INTO imbalance
    FROM "tax_journal_lines"
    WHERE "journalEntryId" = entry_id;
  IF imbalance <> 0 THEN
    RAISE EXCEPTION 'Journal entry % does not balance: debit-credit = %', entry_id, imbalance;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER tax_journal_lines_balance_check
  AFTER INSERT ON "tax_journal_lines"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION tax_journal_entry_must_balance();
