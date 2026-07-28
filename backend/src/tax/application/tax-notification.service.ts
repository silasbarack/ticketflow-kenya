import { Injectable, Logger } from "@nestjs/common";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";

export type TaxNotificationType =
  | "ETIMS_INVOICE_FAILURE"
  | "VAT_MISMATCH"
  | "UNBALANCED_LEDGER"
  | "PRN_MISMATCH"
  | "PAYMENT_FAILURE"
  | "UNCERTAIN_PAYMENT_STATUS"
  | "ORGANIZER_PIN_MISMATCH"
  | "FILING_DEADLINE_APPROACHING"
  | "REFUND_REQUIRES_CREDIT_NOTE"
  | "ORGANIZER_ALREADY_SETTLED_BEFORE_CANCELLATION";

/**
 * Internal notifications for finance/operations. There is no configured
 * outbound email/Slack/SMS channel for the tax module in this codebase —
 * inventing one with no real destination would be worse than not having
 * it. Every notification is instead:
 *   1. Logged at WARN via Nest's Logger (visible in whatever log
 *      aggregation the deployment already uses), and
 *   2. Written as a TaxAuditEvent (queryable via GET
 *      /admin/tax/audit-events, `tax.audit.view`), so it's inspectable
 *      and never lost even without a log pipeline.
 * Never include unmasked KRA PINs, PRNs, or credentials in `message`.
 * See docs/ticketflow-tax-architecture.md "Notifications" for how to wire
 * a real channel (email/Slack) on top of this without touching callers.
 */
@Injectable()
export class TaxNotificationService {
  private readonly logger = new Logger("TaxNotification");

  constructor(private audit: TaxAuditService) {}

  async notify(
    type: TaxNotificationType,
    message: string,
    metadata: Record<string, unknown> = {},
  ) {
    this.logger.warn(`[${type}] ${message}`);
    await this.audit.log({
      action: `NOTIFICATION_${type}`,
      entityType:
        (metadata.entityType as string | undefined) ?? "TaxNotification",
      entityId: (metadata.entityId as string | undefined) ?? type,
      metadata: { message, ...metadata },
    });
  }
}
