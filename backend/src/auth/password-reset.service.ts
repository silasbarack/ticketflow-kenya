import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';

/** How long an emailed code can be used. */
export const CODE_TTL_SECONDS = 10 * 60;
/** Guesses allowed per code, the successful one included. */
export const MAX_CODE_ATTEMPTS = 5;
/** How long the authorisation issued after verification lasts. */
export const RESET_TOKEN_TTL_SECONDS = 15 * 60;
/** Minimum gap between two codes for the same account. */
export const RESEND_COOLDOWN_SECONDS = 60;
/**
 * Codes per account per hour. Without a ceiling, the per-code attempt limit is
 * meaningless: an attacker would simply request a new code every minute and
 * keep guessing.
 */
export const MAX_CODES_PER_HOUR = 5;

/**
 * The only answer the request endpoint ever gives — for a registered address,
 * an unknown one, a deactivated account or a throttled request alike.
 */
const REQUEST_RESPONSE = {
  message: 'If an account exists with this email address, a verification code has been sent.',
  codeExpiresInSeconds: CODE_TTL_SECONDS,
  resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
};

/** One message for every verification failure, so failures reveal nothing. */
const INVALID_CODE_MESSAGE =
  'The verification code is incorrect or has expired. Check the code or request a new one.';

const INVALID_RESET_SESSION_MESSAGE =
  'Your password reset session is invalid or has expired. Please request a new verification code.';

/**
 * Responses are held back to at least this long, so the time a request takes
 * cannot tell an attacker whether the email address has an account.
 */
const REQUEST_RESPONSE_FLOOR_MS = 700;
const VERIFY_RESPONSE_FLOOR_MS = 350;

/**
 * Forgot-password flow: email a 6-digit code, verify it, then allow exactly one
 * password change through a short-lived authorisation.
 *
 * Neither secret is ever stored or logged in the clear. Every state transition
 * is a conditional update that only succeeds against the expected prior state,
 * so concurrent requests cannot double-spend a code, exceed the attempt limit,
 * or replay a reset.
 */
@Injectable()
export class PasswordResetService implements OnModuleInit {
  private readonly logger = new Logger('PasswordResetService');

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private auditLogsService: AuditLogsService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.configService.get<string>('PASSWORD_RESET_SECRET')) {
      this.logger.warn('PASSWORD_RESET_SECRET is not set — falling back to JWT_SECRET to key reset code hashes');
    }
    if (!this.secret) {
      throw new Error('PASSWORD_RESET_SECRET or JWT_SECRET must be set for password reset');
    }
  }

  private get secret(): string {
    return (
      this.configService.get<string>('PASSWORD_RESET_SECRET') || this.configService.get<string>('JWT_SECRET') || ''
    );
  }

  // ── Secrets ───────────────────────────────────────────────────────────────

  /** Uniformly random 000000-999999 from the OS CSPRNG. */
  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * Keyed with a server secret and bound to the request id: without the key a
   * leaked table cannot be brute-forced offline, and the same code in two
   * requests never produces the same hash.
   */
  private hashCode(requestId: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${requestId}:${code}`).digest('hex');
  }

  /** The reset token carries 256 bits of entropy, so a plain SHA-256 suffices. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeEqualHex(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private async holdUntil(startedAt: number, floorMs: number) {
    const remaining = floorMs - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  /**
   * Emails are stored as typed at registration; match exactly first, then
   * case-insensitively, so "Jane@Example.com" can still recover their account.
   */
  private async findUserByEmail(email: string) {
    const exact = await this.prisma.user.findUnique({ where: { email } });
    if (exact) return exact;
    return this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  }

  // ── 1. Request a code ─────────────────────────────────────────────────────

  async requestCode(email: string) {
    const startedAt = Date.now();
    try {
      const user = await this.findUserByEmail(email);
      if (!user || !user.isActive) return REQUEST_RESPONSE;

      const code = this.generateCode();
      const issued = await this.issueCode(user.id, code);
      if (!issued) return REQUEST_RESPONSE;

      await this.auditLogsService.log({
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
      });

      // Not awaited: an SMTP round-trip takes seconds, and waiting on it would
      // make registered addresses measurably slower than unknown ones.
      void this.deliverCode(user.email, user.firstName, code);

      return REQUEST_RESPONSE;
    } finally {
      await this.holdUntil(startedAt, REQUEST_RESPONSE_FLOOR_MS);
    }
  }

  /**
   * Retires every open request for the account and records a new one — unless
   * the account is inside its cooldown or over its hourly allowance, in which
   * case nothing happens and the caller still sees the generic response.
   *
   * Serializable, so two simultaneous requests cannot both slip under the
   * cooldown and leave two live codes.
   */
  private async issueCode(userId: string, code: string): Promise<boolean> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const recent = await tx.passwordResetRequest.findMany({
            where: { userId, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
            return false;
          }
          if (recent.length >= MAX_CODES_PER_HOUR) {
            return false;
          }

          // A new code makes every earlier code — and any reset authorisation
          // issued from one — unusable.
          await tx.passwordResetRequest.updateMany({
            where: { userId, invalidatedAt: null, consumedAt: null },
            data: { invalidatedAt: now },
          });

          const id = randomUUID();
          await tx.passwordResetRequest.create({
            data: {
              id,
              userId,
              codeHash: this.hashCode(id, code),
              expiresAt: new Date(now.getTime() + CODE_TTL_SECONDS * 1000),
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // A serialization failure means a concurrent request for the same account
      // won the race and issued the code — this one is simply a duplicate.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return false;
      throw error;
    }
  }

  private async deliverCode(email: string, firstName: string, code: string) {
    try {
      const sent = await this.emailService.sendPasswordResetCodeEmail({
        to: email,
        firstName,
        code,
        expiresInMinutes: CODE_TTL_SECONDS / 60,
      });

      // Local development without SMTP only, and only when explicitly asked for:
      // the code is a live credential and must never reach production logs.
      if (
        !sent &&
        this.configService.get<string>('NODE_ENV') !== 'production' &&
        this.configService.get<string>('PASSWORD_RESET_DEV_LOG_CODES') === 'true'
      ) {
        this.logger.warn(`[DEV ONLY — email not sent] password reset code for ${email}: ${code}`);
      }
    } catch (error) {
      this.logger.error(`Password reset code delivery failed: ${(error as Error).message}`);
    }
  }

  // ── 2. Verify the code ────────────────────────────────────────────────────

  async verifyCode(email: string, code: string) {
    const startedAt = Date.now();
    try {
      return await this.verifyCodeInner(email, code);
    } finally {
      await this.holdUntil(startedAt, VERIFY_RESPONSE_FLOOR_MS);
    }
  }

  private async verifyCodeInner(email: string, code: string) {
    const invalid = () => new BadRequestException(INVALID_CODE_MESSAGE);

    const user = await this.findUserByEmail(email);
    if (!user || !user.isActive) {
      // Same work as the real comparison below.
      this.hashCode(randomUUID(), code);
      throw invalid();
    }

    const now = new Date();
    const active = await this.prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        invalidatedAt: null,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) {
      this.hashCode(randomUUID(), code);
      throw invalid();
    }

    // Spend an attempt *before* comparing. Checking first and counting after
    // would let a burst of parallel guesses all read attempts=4 and each get a
    // try, blowing straight through the limit.
    const claimed = await this.prisma.passwordResetRequest.updateMany({
      where: {
        id: active.id,
        invalidatedAt: null,
        verifiedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) throw invalid();

    if (!this.safeEqualHex(this.hashCode(active.id, code), active.codeHash)) {
      const after = await this.prisma.passwordResetRequest.findUnique({
        where: { id: active.id },
        select: { attempts: true },
      });
      if (after && after.attempts >= MAX_CODE_ATTEMPTS) {
        await this.prisma.passwordResetRequest.updateMany({
          where: { id: active.id, invalidatedAt: null },
          data: { invalidatedAt: new Date() },
        });
        await this.auditLogsService.log({
          actorId: user.id,
          action: 'PASSWORD_RESET_CODE_LOCKED',
          entityType: 'User',
          entityId: user.id,
          metadata: { attempts: after.attempts },
        });
      }
      throw invalid();
    }

    const resetToken = randomBytes(32).toString('base64url');
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

    // Conditional on the request still being unverified and live: a second
    // correct submission, or a new code requested a moment ago, gets nothing.
    const verified = await this.prisma.passwordResetRequest.updateMany({
      where: { id: active.id, invalidatedAt: null, verifiedAt: null, consumedAt: null },
      data: {
        verifiedAt: new Date(),
        resetTokenHash: this.hashToken(resetToken),
        resetTokenExpiresAt,
      },
    });
    if (verified.count === 0) throw invalid();

    await this.auditLogsService.log({
      actorId: user.id,
      action: 'PASSWORD_RESET_CODE_VERIFIED',
      entityType: 'User',
      entityId: user.id,
    });

    return { resetToken, expiresInSeconds: RESET_TOKEN_TTL_SECONDS };
  }

  // ── 3. Set the new password ───────────────────────────────────────────────

  async resetPassword(resetToken: string, password: string) {
    const invalid = () => new BadRequestException(INVALID_RESET_SESSION_MESSAGE);

    const request = await this.prisma.passwordResetRequest.findUnique({
      where: { resetTokenHash: this.hashToken(resetToken) },
      include: { user: { select: { id: true, isActive: true } } },
    });

    const now = new Date();
    if (
      !request ||
      !request.verifiedAt ||
      request.consumedAt ||
      request.invalidatedAt ||
      !request.resetTokenExpiresAt ||
      request.resetTokenExpiresAt <= now ||
      !request.user.isActive
    ) {
      throw invalid();
    }

    // Same cost factor as registration.
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction(async (tx) => {
      // Consume the authorisation first; if a parallel submission already did,
      // this one changes nothing.
      const consumed = await tx.passwordResetRequest.updateMany({
        where: {
          id: request.id,
          consumedAt: null,
          invalidatedAt: null,
          resetTokenExpiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date(), invalidatedAt: new Date() },
      });
      if (consumed.count === 0) throw invalid();

      await tx.user.update({
        where: { id: request.userId },
        // passwordChangedAt signs out every existing session (see JwtStrategy).
        data: { passwordHash, passwordChangedAt: new Date() },
      });

      await tx.passwordResetRequest.updateMany({
        where: { userId: request.userId, invalidatedAt: null },
        data: { invalidatedAt: new Date() },
      });
    });

    await this.auditLogsService.log({
      actorId: request.userId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: request.userId,
    });

    return { message: 'Password reset successful. You can now sign in using your new password.' };
  }

  // ── Housekeeping ──────────────────────────────────────────────────────────

  /** Reset requests are only useful for minutes; the audit log keeps the history. */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeStaleRequests() {
    const { count } = await this.prisma.passwordResetRequest.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (count > 0) this.logger.log(`Purged ${count} stale password reset request(s)`);
  }
}
