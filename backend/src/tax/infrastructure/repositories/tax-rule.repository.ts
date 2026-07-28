import { Injectable } from "@nestjs/common";
import { TaxRule as PrismaTaxRule } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RoundingMode } from "../../domain/money/money";
import {
  NoApplicableTaxRuleError,
  OverlappingTaxRuleError,
  TaxRule,
  TaxRuleCode,
} from "../../domain/tax-rule/tax-rule.types";

const EXCLUSION_VIOLATION = "23P01";

function toDomain(row: PrismaTaxRule): TaxRule {
  return {
    id: row.id,
    code: row.code as TaxRuleCode,
    jurisdiction: row.jurisdiction as "KE",
    rateBps: row.rateBps,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    roundingMode: row.roundingMode as RoundingMode,
    enabled: row.enabled,
    requiresReview: row.requiresReview,
    sourceReference: row.sourceReference,
    notes: row.notes,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface CreateTaxRuleInput {
  code: TaxRuleCode;
  jurisdiction?: "KE";
  rateBps: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  roundingMode?: RoundingMode;
  enabled?: boolean;
  requiresReview?: boolean;
  sourceReference?: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

/**
 * Effective-dated tax-rule repository. Overlap prevention is enforced
 * twice: here (an application-level pre-check that produces a friendly
 * error) and at the database layer via a GiST exclusion constraint
 * (`tax_rules_no_overlap`, added in the tax module migration) that is the
 * true source of correctness under concurrent writes.
 */
@Injectable()
export class TaxRuleRepository {
  constructor(private prisma: PrismaService) {}

  async findEffective(
    code: TaxRuleCode,
    asOf: Date,
    jurisdiction: "KE" = "KE",
  ): Promise<TaxRule> {
    const row = await this.prisma.taxRule.findFirst({
      where: {
        code,
        jurisdiction,
        enabled: true,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!row) throw new NoApplicableTaxRuleError(code, jurisdiction, asOf);
    return toDomain(row);
  }

  async findById(id: string): Promise<TaxRule | null> {
    const row = await this.prisma.taxRule.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async list(
    params: { code?: TaxRuleCode; enabledOnly?: boolean } = {},
  ): Promise<TaxRule[]> {
    const rows = await this.prisma.taxRule.findMany({
      where: {
        code: params.code,
        enabled: params.enabledOnly ? true : undefined,
      },
      orderBy: [{ code: "asc" }, { effectiveFrom: "desc" }],
    });
    return rows.map(toDomain);
  }

  private async assertNoOverlap(
    code: TaxRuleCode,
    jurisdiction: string,
    effectiveFrom: Date,
    effectiveTo: Date | null | undefined,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.prisma.taxRule.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        code,
        jurisdiction,
        enabled: true,
        effectiveFrom: {
          lt: effectiveTo ?? new Date("9999-12-31T00:00:00.000Z"),
        },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
      },
    });
    if (overlapping) {
      throw new OverlappingTaxRuleError(code, jurisdiction);
    }
  }

  async create(input: CreateTaxRuleInput): Promise<TaxRule> {
    const jurisdiction = input.jurisdiction ?? "KE";
    const enabled = input.enabled ?? true;
    if (enabled) {
      await this.assertNoOverlap(
        input.code,
        jurisdiction,
        input.effectiveFrom,
        input.effectiveTo ?? null,
      );
    }
    try {
      const row = await this.prisma.taxRule.create({
        data: {
          code: input.code,
          jurisdiction,
          rateBps: input.rateBps,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo ?? null,
          roundingMode: input.roundingMode ?? "HALF_UP",
          enabled,
          requiresReview: input.requiresReview ?? true,
          sourceReference: input.sourceReference,
          notes: input.notes,
          createdBy: input.createdBy,
          approvedBy: input.approvedBy,
        },
      });
      return toDomain(row);
    } catch (error: unknown) {
      if (isExclusionViolation(error)) {
        throw new OverlappingTaxRuleError(input.code, jurisdiction);
      }
      throw error;
    }
  }

  async approve(id: string, approvedBy: string): Promise<TaxRule> {
    const row = await this.prisma.taxRule.update({
      where: { id },
      data: { approvedBy, requiresReview: false },
    });
    return toDomain(row);
  }

  async disable(id: string): Promise<TaxRule> {
    const row = await this.prisma.taxRule.update({
      where: { id },
      data: { enabled: false },
    });
    return toDomain(row);
  }
}

function isExclusionViolation(error: unknown): boolean {
  // Raw Postgres exclusion-constraint violations surface either as a
  // PrismaClientUnknownRequestError (message contains the SQLSTATE) or, in
  // some driver paths, as a plain error carrying a `.code`. Check both.
  if (typeof error !== "object" || error === null) return false;
  const maybeCode = (error as { code?: string }).code;
  if (maybeCode === EXCLUSION_VIOLATION) return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes(EXCLUSION_VIOLATION) ||
    message.includes("tax_rules_no_overlap")
  );
}
