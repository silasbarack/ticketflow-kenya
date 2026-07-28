import { RoundingMode } from "../money/money";

/**
 * Effective-dated tax rule. Mirrors the `tax_rules` table
 * (backend/prisma/schema.prisma). Overlapping enabled rules for the same
 * (code, jurisdiction) are rejected both at the application layer
 * (TaxRuleRepository) and at the database layer (GiST exclusion
 * constraint added in the tax module migration).
 *
 * Seeded rules are demonstration data only — see prisma/seed-tax.ts and
 * docs/ticketflow-tax-architecture.md. They are NOT tax advice and must be
 * reviewed/approved by a qualified Kenyan tax professional before
 * production use (`requiresReview`, `approvedBy`).
 */
export type TaxRuleCode =
  | "TICKETFLOW_PLATFORM_OUTPUT_VAT"
  | "ORGANIZER_TICKET_OUTPUT_VAT"
  | "CORPORATION_TAX_PROVISION"
  | "SUPPLIER_WITHHOLDING_TAX"
  | "PAYE"
  | "AFFORDABLE_HOUSING_LEVY"
  | "OTHER";

export interface TaxRule {
  id: string;
  code: TaxRuleCode;
  jurisdiction: "KE";
  rateBps: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  roundingMode: RoundingMode;
  enabled: boolean;
  requiresReview: boolean;
  sourceReference?: string | null;
  notes?: string | null;
  createdBy: string;
  approvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OverlappingTaxRuleError extends Error {
  constructor(code: TaxRuleCode, jurisdiction: string) {
    super(
      `An enabled ${code} rule already covers part of this effective date range in ${jurisdiction}`,
    );
    this.name = "OverlappingTaxRuleError";
  }
}

export class NoApplicableTaxRuleError extends Error {
  constructor(code: TaxRuleCode, jurisdiction: string, asOf: Date) {
    super(
      `No enabled ${code} tax rule found for ${jurisdiction} effective on ${asOf.toISOString()}`,
    );
    this.name = "NoApplicableTaxRuleError";
  }
}
