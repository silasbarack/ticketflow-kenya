import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";
import { EtimsSandboxAdapter } from "../integrations/etims/etims-sandbox.adapter";
import { EtimsProductionAdapter } from "../integrations/etims/etims-production.adapter";
import {
  EtimsClient,
  SubmitEtimsCreditNoteRequest,
  SubmitEtimsInvoiceRequest,
} from "../integrations/etims/etims-client.interface";
import { toJsonSafe } from "../domain/money/json-safe";

const MAX_ATTEMPTS = 5;

/**
 * Application-layer orchestration for eTIMS invoice/credit-note
 * submission and its retry outbox. Selects the adapter from
 * CompanyTaxProfile.etimsMode:
 *   DISABLED  -> refuses immediately, no adapter call, PENDING_CONFIGURATION.
 *   SANDBOX   -> EtimsSandboxAdapter (never returns ACCEPTED/real status).
 *   OSCU/VSCU -> EtimsProductionAdapter (fails closed until certified).
 *
 * Every submission is idempotent on the sale/refund's own immutable
 * identity (`ETIMS-INVOICE:{calculationId}` / `ETIMS-CREDIT-NOTE:
 * {refundCalculationId}`), so a retried job or a double-click can never
 * create two documents for the same sale.
 */
@Injectable()
export class EtimsDocumentService {
  constructor(
    private prisma: PrismaService,
    private sandboxAdapter: EtimsSandboxAdapter,
    private productionAdapter: EtimsProductionAdapter,
    private audit: TaxAuditService,
  ) {}

  private async selectAdapter(): Promise<{
    adapter: EtimsClient | null;
    mode: string;
  }> {
    const profile = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    const mode = profile?.etimsMode ?? "DISABLED";
    if (mode === "SANDBOX") return { adapter: this.sandboxAdapter, mode };
    if (mode === "OSCU" || mode === "VSCU")
      return { adapter: this.productionAdapter, mode };
    return { adapter: null, mode: "DISABLED" };
  }

  async submitInvoice(
    orderId: string,
    calculationId: string,
    request: Omit<
      SubmitEtimsInvoiceRequest,
      "idempotencyKey" | "externalReference"
    >,
    actorUserId?: string,
  ) {
    const idempotencyKey = `ETIMS-INVOICE:${calculationId}`;
    const existing = await this.prisma.etimsDocument.findUnique({
      where: { idempotencyKey },
    });
    if (
      existing &&
      ["SUBMITTED", "ACCEPTED", "SANDBOX_SIMULATED"].includes(existing.status)
    ) {
      return existing; // already submitted — never double-submit.
    }

    const { adapter, mode } = await this.selectAdapter();
    const externalReference = existing?.externalReference ?? idempotencyKey;

    const document =
      existing ??
      (await this.prisma.etimsDocument.create({
        data: {
          documentType: "INVOICE",
          orderId,
          mode: mode as any,
          externalReference,
          idempotencyKey,
          status: "PENDING_SUBMISSION",
          requestPayload: toJsonSafe({
            ...request,
            idempotencyKey,
            externalReference,
          }) as any,
          createdBy: actorUserId,
        },
      }));

    if (!adapter) {
      const updated = await this.prisma.etimsDocument.update({
        where: { id: document.id },
        data: {
          status: "PENDING_CONFIGURATION",
          lastError:
            "ETIMS_MODE is DISABLED — enable SANDBOX for testing or complete OSCU/VSCU onboarding for production.",
        },
      });
      await this.audit.log({
        action: "ETIMS_SUBMISSION_BLOCKED_DISABLED",
        entityType: "EtimsDocument",
        entityId: document.id,
        actorUserId,
        metadata: { orderId, calculationId },
      });
      return updated;
    }

    return this.attemptSubmission(
      document.id,
      adapter,
      { ...request, idempotencyKey, externalReference },
      "INVOICE",
      actorUserId,
    );
  }

  async submitCreditNote(
    refundId: string,
    refundCalculationId: string,
    request: Omit<
      SubmitEtimsCreditNoteRequest,
      "idempotencyKey" | "externalReference"
    >,
    actorUserId?: string,
  ) {
    const idempotencyKey = `ETIMS-CREDIT-NOTE:${refundCalculationId}`;
    const existing = await this.prisma.etimsDocument.findUnique({
      where: { idempotencyKey },
    });
    if (
      existing &&
      ["SUBMITTED", "ACCEPTED", "SANDBOX_SIMULATED"].includes(existing.status)
    ) {
      return existing;
    }

    const { adapter, mode } = await this.selectAdapter();
    const externalReference = existing?.externalReference ?? idempotencyKey;

    const document =
      existing ??
      (await this.prisma.etimsDocument.create({
        data: {
          documentType: "CREDIT_NOTE",
          refundId,
          mode: mode as any,
          externalReference,
          idempotencyKey,
          status: "PENDING_SUBMISSION",
          requestPayload: toJsonSafe({
            ...request,
            idempotencyKey,
            externalReference,
          }) as any,
          createdBy: actorUserId,
        },
      }));

    if (!adapter) {
      const updated = await this.prisma.etimsDocument.update({
        where: { id: document.id },
        data: {
          status: "PENDING_CONFIGURATION",
          lastError: "ETIMS_MODE is DISABLED.",
        },
      });
      await this.audit.log({
        action: "ETIMS_SUBMISSION_BLOCKED_DISABLED",
        entityType: "EtimsDocument",
        entityId: document.id,
        actorUserId,
        metadata: { refundId, refundCalculationId },
      });
      return updated;
    }

    return this.attemptSubmission(
      document.id,
      adapter,
      { ...request, idempotencyKey, externalReference },
      "CREDIT_NOTE",
      actorUserId,
    );
  }

  private async attemptSubmission(
    documentId: string,
    adapter: EtimsClient,
    request: SubmitEtimsInvoiceRequest | SubmitEtimsCreditNoteRequest,
    type: "INVOICE" | "CREDIT_NOTE",
    actorUserId?: string,
  ) {
    try {
      const result =
        type === "INVOICE"
          ? await adapter.submitInvoice(request as SubmitEtimsInvoiceRequest)
          : await adapter.submitCreditNote(
              request as SubmitEtimsCreditNoteRequest,
            );

      const updated = await this.prisma.etimsDocument.update({
        where: { id: documentId },
        data: {
          status: result.status as any,
          responsePayload: toJsonSafe(result) as any,
          attemptCount: { increment: 1 },
          submittedAt: new Date(),
          acceptedAt: result.status === "ACCEPTED" ? new Date() : undefined,
          lastError: null,
          nextAttemptAt: null,
        },
      });

      await this.audit.log({
        action:
          type === "INVOICE"
            ? "ETIMS_INVOICE_SUBMITTED"
            : "ETIMS_CREDIT_NOTE_SUBMITTED",
        entityType: "EtimsDocument",
        entityId: documentId,
        actorUserId,
        metadata: { status: result.status },
      });

      return updated;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown eTIMS submission error";
      const document = await this.prisma.etimsDocument.findUniqueOrThrow({
        where: { id: documentId },
      });
      const attemptCount = document.attemptCount + 1;
      const status =
        attemptCount >= MAX_ATTEMPTS ? "REQUIRES_REVIEW" : "PENDING_SUBMISSION";

      const updated = await this.prisma.etimsDocument.update({
        where: { id: documentId },
        data: {
          status,
          attemptCount,
          lastError: message,
          nextAttemptAt:
            status === "PENDING_SUBMISSION" ? nextBackoff(attemptCount) : null,
        },
      });

      await this.audit.log({
        action: "ETIMS_SUBMISSION_FAILED",
        entityType: "EtimsDocument",
        entityId: documentId,
        actorUserId,
        metadata: { attemptCount, message, status },
      });

      return updated;
    }
  }

  /** "etims.retry" permission-gated manual retry, also used by the outbox job. */
  async retry(documentId: string, actorUserId?: string) {
    const document = await this.prisma.etimsDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException("eTIMS document not found");
    if (
      ![
        "PENDING_SUBMISSION",
        "REQUIRES_REVIEW",
        "PENDING_CONFIGURATION",
      ].includes(document.status)
    ) {
      throw new BadRequestException(
        `eTIMS document ${documentId} is ${document.status} — nothing to retry`,
      );
    }

    const { adapter } = await this.selectAdapter();
    if (!adapter) {
      return this.prisma.etimsDocument.update({
        where: { id: documentId },
        data: { status: "PENDING_CONFIGURATION" },
      });
    }

    const request = document.requestPayload as unknown as
      SubmitEtimsInvoiceRequest | SubmitEtimsCreditNoteRequest;
    return this.attemptSubmission(
      documentId,
      adapter,
      request,
      document.documentType as "INVOICE" | "CREDIT_NOTE",
      actorUserId,
    );
  }

  async listRetryable(limit = 25) {
    return this.prisma.etimsDocument.findMany({
      where: {
        status: "PENDING_SUBMISSION",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        attemptCount: { lt: MAX_ATTEMPTS },
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(documentId: string) {
    const document = await this.prisma.etimsDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException("eTIMS document not found");
    return document;
  }
}

function nextBackoff(attemptCount: number): Date {
  const minutes = Math.min(60 * 24, 5 * 2 ** attemptCount); // 5,10,20,40... min, capped at 24h
  return new Date(Date.now() + minutes * 60_000);
}
