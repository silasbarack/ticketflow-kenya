import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PersonaIdentityService } from '../identity/persona-identity.service';
import { AutomationQueueService } from './automation-queue.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { JOB_TYPES } from './job-types';

const DAY = 86_400_000;
const FINAL_PERSONA_STATUSES = ['approved', 'declined', 'failed'];

function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7)}`;
}

/**
 * Plain-language explanation of a verification state, built only from what
 * Persona and the admin reviewer actually recorded. Deterministic on purpose:
 * identity results never go to a language model.
 */
export function explainVerification(profile: {
  verificationStatus: string;
  personaInquiryStatus: string | null;
  personaIdentityFailureReason: string | null;
  representativeIdentityVerified: boolean;
  verificationReviewNote: string | null;
}) {
  const persona = (profile.personaInquiryStatus || '').toLowerCase();
  const steps: string[] = [];
  let headline: string;

  switch (profile.verificationStatus) {
    case 'VERIFIED':
      headline = 'Your organisation is verified. Ticket sales are open.';
      break;
    case 'REJECTED':
      headline = 'Your verification was not approved.';
      if (profile.verificationReviewNote) steps.push(`Reviewer note: ${profile.verificationReviewNote}`);
      steps.push('Contact support if you believe this is a mistake. Only the TicketFlow review team can change this decision.');
      break;
    case 'CHANGES_REQUIRED':
      headline = 'Our reviewers need some changes before they can approve you.';
      if (profile.verificationReviewNote) steps.push(`Reviewer note: ${profile.verificationReviewNote}`);
      steps.push('Update the sections mentioned and submit again.');
      break;
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      headline = 'Your application is with our review team.';
      steps.push('Reviews usually take one to two business days. You will get an email when there is a decision.');
      break;
    default:
      headline = 'Your verification is not finished yet.';
      steps.push('Complete each section and submit your application for review.');
  }

  if (!profile.representativeIdentityVerified) {
    if (persona === 'declined' || persona === 'failed') {
      steps.push(
        `Identity check result from Persona: ${profile.personaIdentityFailureReason || persona}. Start a new identity check with a clear photo of a valid ID and good lighting for the selfie.`,
      );
    } else if (persona === 'needs_review' || persona === 'pending' || persona === 'completed') {
      steps.push('Your identity check is with Persona for review. No action is needed right now.');
    } else if (persona === 'created' || persona === 'expired') {
      steps.push('Your identity check was started but not completed. Open the representative step to finish it.');
    } else if (!persona) {
      steps.push('The representative identity check has not been started.');
    }
  }

  return { headline, steps, identityProvider: 'Persona', authoritative: 'Persona and the TicketFlow review team' };
}

/**
 * Keeps organiser verification moving without making any decisions: syncs
 * Persona's status (Persona is the authority), nudges organisers who stalled,
 * and tells admins about applications waiting too long for review.
 */
@Injectable()
export class VerificationAutomationService {
  private readonly logger = new Logger(VerificationAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly persona: PersonaIdentityService,
    private readonly queue: AutomationQueueService,
    private readonly alerts: OperationalAlertsService,
    private readonly audit: AuditLogsService,
    private readonly config: ConfigService,
  ) {}

  private get enabled() {
    return this.config.get<string>('AUTOMATION_MONITORS_ENABLED') !== 'false';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduled() {
    if (!this.enabled) return;
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Verification automation failed: ${(error as Error).message}`);
    }
  }

  async run(now = new Date()) {
    return {
      synced: await this.syncPersonaStatuses(),
      remindersQueued: await this.queueReminders(now),
      stalledReviews: await this.flagStalledReviews(now),
    };
  }

  async syncPersonaStatuses() {
    if (!this.persona.isConfigured()) return 0;
    const profiles = await this.prisma.organizerProfile.findMany({
      where: {
        personaInquiryId: { not: null },
        representativeIdentityVerified: false,
        OR: [{ personaInquiryStatus: null }, { personaInquiryStatus: { notIn: FINAL_PERSONA_STATUSES } }],
        updatedAt: { lt: new Date(Date.now() - 30 * 60_000) },
      },
      select: { id: true, userId: true, personaInquiryStatus: true },
      take: 20,
    });
    let changed = 0;
    for (const p of profiles) {
      try {
        const result = await this.persona.refreshInquiryStatus(p.userId);
        if (result.status !== p.personaInquiryStatus) {
          changed++;
          await this.audit.log({
            action: 'VERIFICATION_STATUS_SYNCED',
            entityType: 'OrganizerProfile',
            entityId: p.id,
            metadata: { provider: 'PERSONA', from: p.personaInquiryStatus, to: result.status },
          });
        }
      } catch (error) {
        this.logger.warn(`Persona sync failed for organizer ${p.id}: ${(error as Error).message}`);
      }
    }
    return changed;
  }

  async queueReminders(now: Date) {
    const profiles = await this.prisma.organizerProfile.findMany({
      where: {
        verificationStatus: { in: ['IN_PROGRESS', 'CHANGES_REQUIRED'] },
        updatedAt: { lt: new Date(now.getTime() - 3 * DAY) },
      },
      select: { id: true },
      take: 200,
    });
    const week = isoWeek(now);
    for (const p of profiles) {
      await this.queue.enqueue(JOB_TYPES.VERIFICATION_REMINDER, `verification-reminder:${p.id}:${week}`, { organizerId: p.id }, { maxAttempts: 3 });
    }
    return profiles.length;
  }

  async flagStalledReviews(now: Date) {
    const profiles = await this.prisma.organizerProfile.findMany({
      where: {
        verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        verificationSubmittedAt: { lt: new Date(now.getTime() - 2 * DAY) },
      },
      select: { id: true, verificationStatus: true, verificationSubmittedAt: true },
      take: 200,
    });
    for (const p of profiles) {
      await this.alerts.raise({
        kind: 'VERIFICATION_REVIEW_OVERDUE',
        severity: 'WARNING',
        category: 'VERIFICATION',
        title: 'Organiser verification waiting more than 48 hours for review',
        dedupeKey: `verification-overdue:${p.id}:${p.verificationSubmittedAt?.toISOString()}`,
        entityType: 'OrganizerProfile',
        entityId: p.id,
        details: { organizerId: p.id, status: p.verificationStatus, submittedAt: p.verificationSubmittedAt },
      });
    }
    return profiles.length;
  }
}
