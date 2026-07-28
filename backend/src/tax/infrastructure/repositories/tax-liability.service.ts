import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxAuditService } from "./tax-audit.service";
import { assertDifferentActors } from "../../domain/permissions/tax-permission.types";
import {
  assertValidTransition,
  TaxLiabilityStatus,
} from "../../domain/liability/tax-liability.types";
import { stableHash } from "../../domain/audit/hash";

export interface CreateTaxLiabilityInput {
  periodId?: string;
  taxHead: string;
  taxSubHead?: string;
  owner: "TICKETFLOW" | "ORGANIZER";
  organizerId?: string;
  amountMinor: bigint;
  currency?: "KES";
  dueDate?: Date;
}

/**
 * Application-layer use cases: "create-tax-liability" and
 * "approve-tax-liability", plus the shared state-machine transition
 * helper other services (PRN attach, payment adapters) call through.
 */
@Injectable()
export class TaxLiabilityService {
  constructor(
    private prisma: PrismaService,
    private audit: TaxAuditService,
    private configService?: ConfigService,
  ) {}

  /**
   * TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR: an explicit, documented
   * low-value exception to maker-checker (see .env.example and
   * docs/ticketflow-tax-architecture.md "Maker-checker controls"). Unset
   * or unparsable means "no exception" — maker-checker always applies.
   */
  private approvalThresholdMinor(): bigint | null {
    const raw = this.configService?.get<string>(
      "TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR",
    );
    if (!raw) return null;
    try {
      const value = BigInt(raw);
      return value >= 0n ? value : null;
    } catch {
      return null;
    }
  }

  async create(input: CreateTaxLiabilityInput, actorUserId: string) {
    if (input.owner === "ORGANIZER" && !input.organizerId) {
      throw new BadRequestException(
        "organizerId is required for an ORGANIZER-owned liability",
      );
    }
    if (input.owner === "TICKETFLOW" && input.organizerId) {
      throw new BadRequestException(
        "A TICKETFLOW-owned liability must not carry an organizerId — organizer tax must never be filed/paid under TicketFlow's own PIN",
      );
    }
    if (input.amountMinor < 0n) {
      throw new BadRequestException("Liability amount must be non-negative");
    }

    const idempotencyKey = `TAX-LIABILITY:${input.periodId ?? "NONE"}:${input.taxHead}:${input.owner}:${input.organizerId ?? "TICKETFLOW"}`;
    const existing = await this.prisma.taxLiability.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;

    const created = await this.prisma.taxLiability.create({
      data: {
        periodId: input.periodId,
        taxHead: input.taxHead,
        taxSubHead: input.taxSubHead,
        owner: input.owner,
        organizerId: input.organizerId,
        amountMinor: input.amountMinor,
        currency: input.currency ?? "KES",
        status: "CALCULATED",
        idempotencyKey,
        preparedBy: actorUserId,
        dueDate: input.dueDate,
      },
    });

    await this.audit.log({
      action: "TAX_LIABILITY_CREATED",
      entityType: "TaxLiability",
      entityId: created.id,
      actorUserId,
      afterHash: stableHash(created),
      metadata: {
        taxHead: input.taxHead,
        owner: input.owner,
        organizerId: input.organizerId,
        amountMinor: input.amountMinor.toString(),
      },
    });

    return created;
  }

  async getOrThrow(id: string) {
    const liability = await this.prisma.taxLiability.findUnique({
      where: { id },
    });
    if (!liability) throw new NotFoundException("Tax liability not found");
    return liability;
  }

  private async transition(
    id: string,
    to: TaxLiabilityStatus,
    actorUserId: string,
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    const liability = await this.getOrThrow(id);
    assertValidTransition(liability.status as TaxLiabilityStatus, to);
    const updated = await this.prisma.taxLiability.update({
      where: { id },
      data: { status: to, ...extra },
    });
    await this.audit.log({
      action,
      entityType: "TaxLiability",
      entityId: id,
      actorUserId,
      beforeHash: stableHash(liability),
      afterHash: stableHash(updated),
      metadata: { from: liability.status, to },
    });
    return updated;
  }

  async reconcile(id: string, actorUserId: string) {
    return this.transition(
      id,
      "RECONCILED",
      actorUserId,
      "TAX_LIABILITY_RECONCILED",
      {
        reconciledBy: actorUserId,
        reconciledAt: new Date(),
      },
    );
  }

  /**
   * Maker-checker: the reconciler and approver must be different users,
   * unless the liability is at or below TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR
   * (an explicit, documented low-value exception — see .env.example).
   */
  async approve(id: string, actorUserId: string) {
    const liability = await this.getOrThrow(id);
    const threshold = this.approvalThresholdMinor();
    const isLowValueException =
      threshold !== null && liability.amountMinor <= threshold;
    if (!isLowValueException) {
      assertDifferentActors(
        "TAX_LIABILITY_APPROVE",
        liability.reconciledBy,
        actorUserId,
      );
    }
    const approved = await this.transition(
      id,
      "APPROVED",
      actorUserId,
      "TAX_LIABILITY_APPROVED",
      {
        approvedBy: actorUserId,
        approvedAt: new Date(),
      },
    );
    // Approval immediately implies a PRN is now required — this is not a
    // separate human decision, so we cascade the transition here.
    return this.transition(
      id,
      "PRN_REQUIRED",
      actorUserId,
      "TAX_LIABILITY_PRN_REQUIRED",
    );
  }

  async reject(id: string, actorUserId: string, reason: string) {
    return this.transition(
      id,
      "REJECTED",
      actorUserId,
      "TAX_LIABILITY_REJECTED",
      {
        rejectedBy: actorUserId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    );
  }

  async requireReview(id: string, actorUserId: string, reason: string) {
    return this.transition(
      id,
      "REQUIRES_REVIEW",
      actorUserId,
      "TAX_LIABILITY_REQUIRES_REVIEW",
      { rejectionReason: reason },
    );
  }

  async cancel(id: string, actorUserId: string, reason: string) {
    return this.transition(
      id,
      "CANCELLED",
      actorUserId,
      "TAX_LIABILITY_CANCELLED",
      { rejectionReason: reason },
    );
  }

  /** Used internally by PRN/payment services — validated the same way, just exposed for composition. */
  async transitionTo(
    id: string,
    to: TaxLiabilityStatus,
    actorUserId: string,
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    return this.transition(id, to, actorUserId, action, extra);
  }

  async list(params: {
    status?: TaxLiabilityStatus;
    owner?: "TICKETFLOW" | "ORGANIZER";
    organizerId?: string;
  }) {
    return this.prisma.taxLiability.findMany({
      where: {
        status: params.status,
        owner: params.owner,
        organizerId: params.organizerId,
      },
      orderBy: { createdAt: "desc" },
      include: { registrations: true, remittances: true },
    });
  }
}
