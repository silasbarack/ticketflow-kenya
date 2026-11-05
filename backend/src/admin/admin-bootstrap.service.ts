import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/**
 * Promotes an existing account to admin at startup when BOOTSTRAP_ADMIN_EMAIL
 * names it — the same change `npm run create-admin -- --email <email>` makes,
 * for hosts where a shell is not to hand.
 *
 * Deliberately narrow: it never creates accounts or touches passwords, it is
 * a no-op once the account is an active admin, and every promotion is
 * audit-logged. Only someone who can edit the service's environment (the
 * Render account owner) can trigger it. Clear the variable afterwards.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogsService,
  ) {}

  async onApplicationBootstrap() {
    const email = (this.config.get<string>('BOOTSTRAP_ADMIN_EMAIL') || '').trim();
    if (!email) return;
    try {
      await this.promote(email);
    } catch (error) {
      // Never let this stop the API from starting.
      this.logger.error(`Admin bootstrap failed: ${(error as Error).message}`);
    }
  }

  async promote(email: string): Promise<'promoted' | 'already-admin' | 'not-found'> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`BOOTSTRAP_ADMIN_EMAIL: no account for ${email}. Register on the site first; nothing was changed.`);
      return 'not-found';
    }
    if (user.role === 'ADMIN' && user.isActive) {
      this.logger.log(`BOOTSTRAP_ADMIN_EMAIL: ${email} is already an active admin. You can clear the variable.`);
      return 'already-admin';
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN', isActive: true } });
    await this.audit.log({
      action: 'ADMIN_BOOTSTRAP_PROMOTED',
      entityType: 'User',
      entityId: user.id,
      metadata: { previousRole: user.role, wasActive: user.isActive, source: 'BOOTSTRAP_ADMIN_EMAIL' },
    });
    this.logger.log(`BOOTSTRAP_ADMIN_EMAIL: promoted ${email} (was ${user.role}${user.isActive ? '' : ', suspended'}) to an active ADMIN. Clear the variable now.`);
    return 'promoted';
  }
}
