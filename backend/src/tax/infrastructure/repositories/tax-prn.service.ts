import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxEncryptionService } from "../../domain/crypto/tax-encryption.service";
import { TaxAuditService } from "./tax-audit.service";
import { TaxLiabilityService } from "./tax-liability.service";
import {
  decimalStringFromMinorUnits,
  minorUnitsFromDecimalString,
} from "../../domain/money/money";

export interface AttachPrnInput {
  liabilityId: string;
  prn: string;
  taxpayerPin: string;
  taxHead: string;
  taxSubHead?: string;
  taxPeriod: string;
  amount: string; // decimal string, e.g. "12345.67" — must equal the approved liability exactly
  currency: "KES";
  issuedAt?: Date;
  expiresAt?: Date;
  source?: "MANUAL_ENTRY" | "FILE_UPLOAD" | "APPROVED_API";
}

/**
 * Application-layer use case: "attach-prn". A PRN can only ever be
 * attached to an APPROVED (or PRN_REQUIRED) liability, must match that
 * liability's amount/currency/tax head/period exactly, and its taxpayer
 * PIN must match the correct owner (TicketFlow's own PIN for a
 * TICKETFLOW-owned liability, the organizer's PIN for an ORGANIZER-owned
 * one — this is the enforcement point for "an organizer's tax must never
 * be filed under TicketFlow's PIN").
 *
 * This module does NOT and cannot generate a real PRN — PRNs are only
 * ever entered here after being generated through iTax by an authorised
 * human. See docs/ticketflow-tax-payment-runbook.md.
 */
@Injectable()
export class TaxPrnService {
  constructor(
    private prisma: PrismaService,
    private encryption: TaxEncryptionService,
    private liabilities: TaxLiabilityService,
    private audit: TaxAuditService,
  ) {}

  async attach(input: AttachPrnInput, actorUserId: string) {
    const liability = await this.liabilities.getOrThrow(input.liabilityId);
    if (!["PRN_REQUIRED", "APPROVED"].includes(liability.status)) {
      throw new BadRequestException(
        `Liability ${liability.id} is ${liability.status} — a PRN can only be attached once it is APPROVED/PRN_REQUIRED`,
      );
    }

    const amountMinor = minorUnitsFromDecimalString(input.amount);
    if (amountMinor !== liability.amountMinor) {
      throw new BadRequestException(
        `PRN amount (${input.amount}) does not match the approved liability amount (${decimalStringFromMinorUnits(liability.amountMinor)}) — attach a PRN generated for the exact approved amount.`,
      );
    }
    if (input.currency !== liability.currency) {
      throw new BadRequestException(
        `PRN currency (${input.currency}) must be ${liability.currency}`,
      );
    }
    if (input.taxHead !== liability.taxHead) {
      throw new BadRequestException(
        `PRN tax head (${input.taxHead}) does not match liability tax head (${liability.taxHead})`,
      );
    }
    if (liability.periodId) {
      const period = await this.prisma.taxPeriod.findUnique({
        where: { id: liability.periodId },
      });
      if (period && period.period !== input.taxPeriod) {
        throw new BadRequestException(
          `PRN tax period (${input.taxPeriod}) does not match liability period (${period.period})`,
        );
      }
    }

    await this.assertTaxpayerPinMatchesOwner(liability, input.taxpayerPin);

    const prnHash = this.encryption.fingerprint(input.prn);
    const duplicate = await this.prisma.taxPaymentRegistration.findUnique({
      where: { prnHash },
    });
    if (duplicate) {
      throw new ConflictException(
        "This PRN has already been attached to a liability — a PRN may not be reused.",
      );
    }

    const registration = await this.prisma.taxPaymentRegistration.create({
      data: {
        liabilityId: liability.id,
        taxpayerPinMasked: this.encryption.mask(input.taxpayerPin),
        taxHead: input.taxHead,
        taxSubHead: input.taxSubHead,
        taxPeriod: input.taxPeriod,
        prnEncrypted: this.encryption.encrypt(input.prn),
        prnHash,
        amountMinor,
        currency: input.currency,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        source: input.source ?? "MANUAL_ENTRY",
        verificationStatus: "PENDING",
        createdBy: actorUserId,
      },
    });

    if (liability.status === "APPROVED") {
      // Normally approve() already cascades APPROVED -> PRN_REQUIRED; this
      // only fires if attach() is reached with the cascade skipped.
      await this.liabilities.transitionTo(
        liability.id,
        "PRN_REQUIRED",
        actorUserId,
        "TAX_PRN_ATTACH_MOVED_TO_PRN_REQUIRED",
      );
    }
    // PRN attached but not yet verified — verification is a distinct, auditable step (see verify()).

    await this.audit.log({
      action: "TAX_PRN_ATTACHED",
      entityType: "TaxPaymentRegistration",
      entityId: registration.id,
      actorUserId,
      metadata: {
        liabilityId: liability.id,
        taxHead: input.taxHead,
        taxPeriod: input.taxPeriod,
        amount: input.amount,
        source: registration.source,
      },
    });

    return registration;
  }

  async verify(registrationId: string, actorUserId: string) {
    const registration = await this.prisma.taxPaymentRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!registration)
      throw new NotFoundException("PRN registration not found");
    if (registration.verificationStatus !== "PENDING") {
      throw new BadRequestException(
        `PRN registration is already ${registration.verificationStatus}`,
      );
    }

    const updated = await this.prisma.taxPaymentRegistration.update({
      where: { id: registrationId },
      data: {
        verificationStatus: "VERIFIED",
        verifiedBy: actorUserId,
        verifiedAt: new Date(),
      },
    });
    await this.liabilities.transitionTo(
      registration.liabilityId,
      "PRN_ATTACHED",
      actorUserId,
      "TAX_PRN_VERIFIED",
    );

    await this.audit.log({
      action: "TAX_PRN_VERIFIED",
      entityType: "TaxPaymentRegistration",
      entityId: registration.id,
      actorUserId,
      metadata: { liabilityId: registration.liabilityId },
    });

    return updated;
  }

  async reject(registrationId: string, actorUserId: string, reason: string) {
    const registration = await this.prisma.taxPaymentRegistration.update({
      where: { id: registrationId },
      data: { verificationStatus: "REJECTED", rejectionReason: reason },
    });
    await this.audit.log({
      action: "TAX_PRN_REJECTED",
      entityType: "TaxPaymentRegistration",
      entityId: registration.id,
      actorUserId,
      metadata: { liabilityId: registration.liabilityId, reason },
    });
    return registration;
  }

  private async assertTaxpayerPinMatchesOwner(
    liability: { owner: string; organizerId: string | null },
    taxpayerPin: string,
  ) {
    if (liability.owner === "TICKETFLOW") {
      const company = await this.prisma.companyTaxProfile.findUnique({
        where: { id: "default" },
      });
      if (!company?.kraPinEncrypted) {
        throw new BadRequestException(
          "TicketFlow KRA PIN is not configured on the company tax profile — set it before attaching a PRN.",
        );
      }
      const companyPin = this.encryption.decrypt(company.kraPinEncrypted);
      if (companyPin !== taxpayerPin) {
        throw new BadRequestException(
          "PRN taxpayer PIN does not match TicketFlow's registered KRA PIN.",
        );
      }
      return;
    }

    if (!liability.organizerId) {
      throw new BadRequestException(
        "ORGANIZER-owned liability is missing organizerId — cannot verify taxpayer PIN.",
      );
    }
    const organizerProfile = await this.prisma.organizerTaxProfile.findUnique({
      where: { organizerId: liability.organizerId },
    });
    if (!organizerProfile?.kraPinEncrypted) {
      throw new BadRequestException(
        "Organizer KRA PIN is not configured on the organizer tax profile — set it before attaching a PRN.",
      );
    }
    const organizerPin = this.encryption.decrypt(
      organizerProfile.kraPinEncrypted,
    );
    if (organizerPin !== taxpayerPin) {
      throw new BadRequestException(
        "PRN taxpayer PIN does not match the organizer's registered KRA PIN — an organizer's tax must never be filed or paid under TicketFlow's own PIN, and vice versa.",
      );
    }
  }
}
