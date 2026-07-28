import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxEncryptionService } from "../../domain/crypto/tax-encryption.service";
import { TaxAuditService } from "./tax-audit.service";
import { stableHash } from "../../domain/audit/hash";

export interface UpdateOrganizerTaxProfileInput {
  legalName?: string;
  kraPin?: string;
  vatRegistrationStatus?: "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";
  eventSupplyTreatment?:
    | "STANDARD_RATED"
    | "ZERO_RATED"
    | "EXEMPT"
    | "OUT_OF_SCOPE"
    | "REQUIRES_REVIEW";
  ticketPricingMode?: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";
  delegatedTaxPaymentAuthority?: boolean;
  delegatedAuthorityDocumentId?: string;
}

/**
 * Organizer-level tax profile. `eventSupplyTreatment` always defaults to
 * REQUIRES_REVIEW on creation — it is never inferred from an event title
 * or category, only set explicitly by an authorised finance/admin user via
 * PATCH /admin/organizers/:organizerId/tax-profile.
 */
@Injectable()
export class OrganizerTaxProfileService {
  constructor(
    private prisma: PrismaService,
    private encryption: TaxEncryptionService,
    private audit: TaxAuditService,
  ) {}

  async getByOrganizerId(organizerId: string) {
    const profile = await this.getOrCreateDefault(organizerId);
    return this.toPublic(profile);
  }

  private async getOrCreateDefault(organizerId: string) {
    const existing = await this.prisma.organizerTaxProfile.findUnique({
      where: { organizerId },
    });
    if (existing) return existing;

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });
    if (!organizer) throw new NotFoundException("Organizer not found");

    return this.prisma.organizerTaxProfile.create({
      data: {
        organizerId,
        legalName: organizer.companyName,
        vatRegistrationStatus: "UNKNOWN",
        eventSupplyTreatment: "REQUIRES_REVIEW",
        ticketPricingMode: "VAT_INCLUSIVE",
        delegatedTaxPaymentAuthority: false,
      },
    });
  }

  async update(
    organizerId: string,
    input: UpdateOrganizerTaxProfileInput,
    actorUserId: string,
  ) {
    const before = await this.getOrCreateDefault(organizerId);

    if (
      input.delegatedTaxPaymentAuthority &&
      !input.delegatedAuthorityDocumentId &&
      !before.delegatedAuthorityDocumentId
    ) {
      throw new Error(
        "delegatedTaxPaymentAuthority cannot be enabled without delegatedAuthorityDocumentId — TicketFlow must never pay an organizer's tax using its own KRA PIN without a verified, on-file delegation document.",
      );
    }

    const data: Record<string, unknown> = {
      legalName: input.legalName,
      vatRegistrationStatus: input.vatRegistrationStatus,
      eventSupplyTreatment: input.eventSupplyTreatment,
      ticketPricingMode: input.ticketPricingMode,
      delegatedTaxPaymentAuthority: input.delegatedTaxPaymentAuthority,
      delegatedAuthorityDocumentId: input.delegatedAuthorityDocumentId,
    };
    if (input.kraPin) {
      data.kraPinEncrypted = this.encryption.encrypt(input.kraPin);
    }
    if (
      input.delegatedTaxPaymentAuthority !== undefined ||
      input.eventSupplyTreatment !== undefined
    ) {
      data.verifiedBy = actorUserId;
      data.verifiedAt = new Date();
    }

    const updated = await this.prisma.organizerTaxProfile.update({
      where: { organizerId },
      data,
    });

    await this.audit.log({
      action: "ORGANIZER_TAX_PROFILE_UPDATED",
      entityType: "OrganizerTaxProfile",
      entityId: updated.id,
      actorUserId,
      beforeHash: stableHash({ ...before, kraPinEncrypted: undefined }),
      afterHash: stableHash({ ...updated, kraPinEncrypted: undefined }),
      metadata: {
        organizerId,
        eventSupplyTreatment: updated.eventSupplyTreatment,
        vatRegistrationStatus: updated.vatRegistrationStatus,
        delegatedTaxPaymentAuthority: updated.delegatedTaxPaymentAuthority,
        kraPinChanged: !!input.kraPin,
      },
    });

    return this.toPublic(updated);
  }

  private toPublic(profile: any) {
    return {
      id: profile.id,
      organizerId: profile.organizerId,
      legalName: profile.legalName,
      kraPinMasked: profile.kraPinEncrypted
        ? this.encryption.mask(this.encryption.decrypt(profile.kraPinEncrypted))
        : null,
      vatRegistrationStatus: profile.vatRegistrationStatus,
      eventSupplyTreatment: profile.eventSupplyTreatment,
      ticketPricingMode: profile.ticketPricingMode,
      delegatedTaxPaymentAuthority: profile.delegatedTaxPaymentAuthority,
      delegatedAuthorityDocumentId: profile.delegatedAuthorityDocumentId,
      verifiedBy: profile.verifiedBy,
      verifiedAt: profile.verifiedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
