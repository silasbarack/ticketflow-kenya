import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxEncryptionService } from "../../domain/crypto/tax-encryption.service";
import { TaxAuditService } from "./tax-audit.service";
import { stableHash } from "../../domain/audit/hash";

export interface UpdateCompanyTaxProfileInput {
  legalName?: string;
  kraPin?: string;
  vatRegistrationStatus?: "REGISTERED" | "NOT_REGISTERED" | "PENDING";
  agencyModel?: "DISCLOSED_AGENT" | "PRINCIPAL_RESELLER";
  etimsMode?: "DISABLED" | "SANDBOX" | "OSCU" | "VSCU";
  taxPaymentMode?:
    | "MANUAL_PRN"
    | "SANDBOX"
    | "APPROVED_BANK_INTEGRATION"
    | "APPROVED_MPESA_INTEGRATION";
}

/**
 * TicketFlow's own (singleton) tax profile. `agencyModel` defaults to and
 * ships as DISCLOSED_AGENT — switching to PRINCIPAL_RESELLER is possible
 * (per the spec's "support a configurable PRINCIPAL_RESELLER model, but
 * do not enable it by default") but is flagged with a warning because
 * ledger postings for that model are not fully implemented yet (see
 * TicketSaleLedgerPostingService).
 */
@Injectable()
export class CompanyTaxProfileService {
  constructor(
    private prisma: PrismaService,
    private encryption: TaxEncryptionService,
    private audit: TaxAuditService,
  ) {}

  async get() {
    const profile = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    return this.toPublic(profile);
  }

  async update(input: UpdateCompanyTaxProfileInput, actorUserId: string) {
    const before = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    const data: Record<string, unknown> = {
      legalName: input.legalName,
      vatRegistrationStatus: input.vatRegistrationStatus,
      agencyModel: input.agencyModel,
      etimsMode: input.etimsMode,
      taxPaymentMode: input.taxPaymentMode,
      updatedBy: actorUserId,
    };
    if (input.kraPin) {
      data.kraPinEncrypted = this.encryption.encrypt(input.kraPin);
    }

    const updated = await this.prisma.companyTaxProfile.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        legalName: input.legalName ?? "TicketFlow Kenya Limited",
        vatRegistrationStatus: input.vatRegistrationStatus ?? "PENDING",
        agencyModel: input.agencyModel ?? "DISCLOSED_AGENT",
        etimsMode: input.etimsMode ?? "DISABLED",
        taxPaymentMode: input.taxPaymentMode ?? "MANUAL_PRN",
        kraPinEncrypted: input.kraPin
          ? this.encryption.encrypt(input.kraPin)
          : undefined,
        updatedBy: actorUserId,
      },
    });

    await this.audit.log({
      action: "COMPANY_TAX_PROFILE_UPDATED",
      entityType: "CompanyTaxProfile",
      entityId: updated.id,
      actorUserId,
      beforeHash: before
        ? stableHash({ ...before, kraPinEncrypted: undefined })
        : undefined,
      afterHash: stableHash({ ...updated, kraPinEncrypted: undefined }),
      metadata: {
        agencyModel: updated.agencyModel,
        etimsMode: updated.etimsMode,
        taxPaymentMode: updated.taxPaymentMode,
        vatRegistrationStatus: updated.vatRegistrationStatus,
        kraPinChanged: !!input.kraPin,
      },
    });

    if (updated.agencyModel === "PRINCIPAL_RESELLER") {
      await this.audit.log({
        action: "PRINCIPAL_RESELLER_MODEL_ENABLED_WARNING",
        entityType: "CompanyTaxProfile",
        entityId: updated.id,
        actorUserId,
        metadata: {
          warning:
            "PRINCIPAL_RESELLER ledger postings are not fully implemented (TicketSaleLedgerPostingService only posts DISCLOSED_AGENT entries). Do not rely on automated ledger postings for principal-reseller sales until that is completed.",
        },
      });
    }

    return this.toPublic(updated);
  }

  private toPublic(profile: any) {
    if (!profile) return null;
    return {
      id: profile.id,
      legalName: profile.legalName,
      kraPinMasked: profile.kraPinEncrypted
        ? this.encryption.mask(this.encryption.decrypt(profile.kraPinEncrypted))
        : null,
      vatRegistrationStatus: profile.vatRegistrationStatus,
      agencyModel: profile.agencyModel,
      etimsMode: profile.etimsMode,
      taxPaymentMode: profile.taxPaymentMode,
      defaultCurrency: profile.defaultCurrency,
      updatedBy: profile.updatedBy,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
