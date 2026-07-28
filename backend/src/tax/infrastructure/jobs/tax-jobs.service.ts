import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { EtimsDocumentService } from "../../application/etims-document.service";
import { TaxPeriodService } from "../repositories/tax-period.service";
import { TaxNotificationService } from "../../application/tax-notification.service";
import { TaxLiabilityService } from "../repositories/tax-liability.service";

const PRN_REQUIRED_STALE_HOURS = 24;
const PAYMENT_PROCESSING_STALE_HOURS = 6;
const FILING_DEADLINE_WARNING_DAYS = 7;

/**
 * Scheduled jobs. None of these release a tax payment or mark anything
 * PAID/KRA_CONFIRMED — they only retry safe, idempotent operations
 * (eTIMS resubmission) or flag things for a human via
 * TaxNotificationService/REQUIRES_REVIEW. Actual payment approval and
 * confirmation always require an explicit authorised API call.
 *
 * Disabled in tests / when TAX_MODULE_ENABLED=false — see TaxModule.
 */
@Injectable()
export class TaxJobsService {
  private readonly logger = new Logger("TaxJobsService");

  constructor(
    private prisma: PrismaService,
    private etims: EtimsDocumentService,
    private periods: TaxPeriodService,
    private notifications: TaxNotificationService,
    private liabilities: TaxLiabilityService,
    private configService: ConfigService,
  ) {}

  private enabled(): boolean {
    return this.configService.get<string>("TAX_MODULE_ENABLED") !== "false";
  }

  /** Retrying eTIMS outbox records. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryEtimsOutbox() {
    if (!this.enabled()) return;
    const retryable = await this.etims.listRetryable(25);
    for (const doc of retryable) {
      try {
        await this.etims.retry(doc.id);
      } catch (error) {
        this.logger.warn(
          `eTIMS outbox retry failed for document ${doc.id}: ${(error as Error).message}`,
        );
      }
    }
    if (retryable.length > 0) {
      this.logger.log(`eTIMS outbox: attempted ${retryable.length} retries`);
    }
  }

  /** Alerting when documents keep failing — surfaces anything stuck REQUIRES_REVIEW. */
  @Cron(CronExpression.EVERY_HOUR)
  async alertOnEtimsFailures() {
    if (!this.enabled()) return;
    const failing = await this.prisma.etimsDocument.findMany({
      where: { status: "REQUIRES_REVIEW" },
      take: 50,
    });
    for (const doc of failing) {
      await this.notifications.notify(
        "ETIMS_INVOICE_FAILURE",
        `eTIMS ${doc.documentType} ${doc.id} has failed ${doc.attemptCount} times and needs manual review`,
        {
          entityType: "EtimsDocument",
          entityId: doc.id,
        },
      );
    }
  }

  /** Preparing draft monthly tax periods — non-destructive, just ensures the current period row exists. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async prepareCurrentPeriodDraft() {
    if (!this.enabled()) return;
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    await this.periods.prepareDraft(period, "SYSTEM_JOB");
  }

  /** Alerting on approaching filing deadlines. */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async alertApproachingDeadlines() {
    if (!this.enabled()) return;
    const cutoff = new Date(
      Date.now() + FILING_DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000,
    );
    const dueSoon = await this.prisma.taxLiability.findMany({
      where: {
        dueDate: { lte: cutoff, gte: new Date() },
        status: { notIn: ["PAID", "KRA_CONFIRMED", "CANCELLED", "REJECTED"] },
      },
    });
    for (const liability of dueSoon) {
      await this.notifications.notify(
        "FILING_DEADLINE_APPROACHING",
        `Tax liability ${liability.id} (${liability.taxHead}) is due ${liability.dueDate?.toISOString()} and is still ${liability.status}`,
        {
          entityType: "TaxLiability",
          entityId: liability.id,
        },
      );
    }
  }

  /** Detecting approved liabilities without PRNs. */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async alertApprovedWithoutPrn() {
    if (!this.enabled()) return;
    const cutoff = new Date(
      Date.now() - PRN_REQUIRED_STALE_HOURS * 60 * 60 * 1000,
    );
    const stale = await this.prisma.taxLiability.findMany({
      where: { status: "PRN_REQUIRED", updatedAt: { lte: cutoff } },
    });
    for (const liability of stale) {
      await this.notifications.notify(
        "FILING_DEADLINE_APPROACHING",
        `Tax liability ${liability.id} has been APPROVED/PRN_REQUIRED for over ${PRN_REQUIRED_STALE_HOURS}h without a PRN attached`,
        {
          entityType: "TaxLiability",
          entityId: liability.id,
        },
      );
    }
  }

  /**
   * Detecting payment-processing states that have remained unresolved too
   * long. Moves them to REQUIRES_REVIEW (a safe, backward step requiring
   * human investigation) rather than retrying or assuming success.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async detectStalePaymentProcessing() {
    if (!this.enabled()) return;
    const cutoff = new Date(
      Date.now() - PAYMENT_PROCESSING_STALE_HOURS * 60 * 60 * 1000,
    );
    const stale = await this.prisma.taxLiability.findMany({
      where: { status: "PAYMENT_PROCESSING", updatedAt: { lte: cutoff } },
    });
    for (const liability of stale) {
      await this.liabilities.requireReview(
        liability.id,
        "SYSTEM_JOB",
        `PAYMENT_PROCESSING for over ${PAYMENT_PROCESSING_STALE_HOURS}h with no confirmation — flagged for manual investigation`,
      );
      await this.notifications.notify(
        "UNCERTAIN_PAYMENT_STATUS",
        `Tax liability ${liability.id} has been PAYMENT_PROCESSING for over ${PAYMENT_PROCESSING_STALE_HOURS}h and was moved to REQUIRES_REVIEW`,
        {
          entityType: "TaxLiability",
          entityId: liability.id,
        },
      );
    }
  }

  /** Detecting unreconciled transactions from the prior day. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async detectUnreconciledYesterday() {
    if (!this.enabled()) return;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const alreadyRun = await this.prisma.reconciliationRun.findFirst({
      where: { type: "DAILY", scope: yesterday },
    });
    if (alreadyRun) return;
    this.logger.log(
      `No daily reconciliation run found for ${yesterday} — operations should trigger POST /admin/tax/reconciliation/daily/${yesterday}`,
    );
    await this.notifications.notify(
      "UNCERTAIN_PAYMENT_STATUS",
      `Daily reconciliation for ${yesterday} has not been run yet`,
      { entityType: "ReconciliationRun", entityId: yesterday },
    );
  }
}
