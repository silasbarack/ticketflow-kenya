import { BadGatewayException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type PersonaInquiry = {
  id: string;
  attributes?: {
    status?: string;
    ['reference-id']?: string | null;
    ['reviewer-comment']?: string | null;
    note?: string | null;
  };
};

@Injectable()
export class PersonaIdentityService {
  private readonly apiBase = 'https://api.withpersona.com/api/v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private get apiKey() {
    return this.config.get<string>('PERSONA_API_KEY');
  }

  private get templateId() {
    return this.config.get<string>('PERSONA_TEMPLATE_ID');
  }

  private get environmentId() {
    return this.config.get<string>('PERSONA_ENVIRONMENT_ID');
  }

  private get webhookSecret() {
    return this.config.get<string>('PERSONA_WEBHOOK_SECRET');
  }

  private get apiVersion() {
    return this.config.get<string>('PERSONA_API_VERSION') || '2025-10-27';
  }

  private requireConfigured() {
    if (!this.apiKey || !this.templateId || !this.environmentId) {
      throw new ServiceUnavailableException(
        'Persona identity verification is not configured yet. Add PERSONA_API_KEY, PERSONA_TEMPLATE_ID and PERSONA_ENVIRONMENT_ID.',
      );
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Persona-Version': this.apiVersion,
    };
  }

  private async request<T>(method: 'get' | 'post', path: string, body?: unknown): Promise<T> {
    try {
      const response = await axios.request<T>({
        method,
        url: this.apiBase + path,
        headers: this.headers(),
        data: body,
        timeout: 15_000,
      });
      return response.data;
    } catch (error: any) {
      const detail =
        error?.response?.data?.errors?.[0]?.detail ||
        error?.response?.data?.errors?.[0]?.title ||
        error?.message ||
        'Persona request failed';
      throw new BadGatewayException(`Persona: ${detail}`);
    }
  }

  private async loadOrganizer(userId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) throw new ServiceUnavailableException('Organizer profile not found');
    return profile;
  }

  private async fetchInquiry(inquiryId: string) {
    const response = await this.request<{ data: PersonaInquiry }>('get', `/inquiries/${inquiryId}`);
    return response.data;
  }

  private async createInquiry(referenceId: string) {
    const response = await this.request<{ data: PersonaInquiry }>('post', '/inquiries', {
      data: {
        attributes: {
          'inquiry-template-id': this.templateId,
          'reference-id': referenceId,
        },
      },
    });
    return response.data;
  }

  private async createSessionToken(inquiryId: string) {
    const response = await this.request<{ meta?: { ['session-token']?: string } }>(
      'post',
      `/inquiries/${inquiryId}/resume`,
      { meta: {} },
    );
    return response.meta?.['session-token'] || null;
  }

  async getOrCreateInquiry(userId: string) {
    this.requireConfigured();
    const profile = await this.loadOrganizer(userId);

    let inquiry: PersonaInquiry | null = null;
    if (profile.personaInquiryId) {
      inquiry = await this.fetchInquiry(profile.personaInquiryId);
    }

    if (!inquiry) {
      inquiry = await this.createInquiry(profile.id);
      await this.prisma.organizerProfile.update({
        where: { id: profile.id },
        data: {
          identityProvider: 'PERSONA',
          personaInquiryId: inquiry.id,
          personaInquiryStatus: inquiry.attributes?.status || 'created',
          personaIdentityFailureReason: null,
          representativeIdentityVerified: false,
        },
      });
      await this.auditLogs.log({
        actorId: userId,
        action: 'PERSONA_INQUIRY_CREATED',
        entityType: 'OrganizerProfile',
        entityId: profile.id,
        metadata: { inquiryId: inquiry.id },
      });
    } else {
      await this.prisma.organizerProfile.update({
        where: { id: profile.id },
        data: {
          identityProvider: 'PERSONA',
          personaInquiryStatus: inquiry.attributes?.status || profile.personaInquiryStatus,
        },
      });
    }

    const status = inquiry.attributes?.status || 'created';
    let sessionToken: string | null = null;
    if (status === 'pending' || status === 'expired') {
      sessionToken = await this.createSessionToken(inquiry.id);
    }

    return {
      inquiryId: inquiry.id,
      sessionToken,
      environmentId: this.environmentId,
      status,
      verified: status === 'approved' || profile.representativeIdentityVerified,
    };
  }

  async refreshInquiryStatus(userId: string) {
    this.requireConfigured();
    const profile = await this.loadOrganizer(userId);
    if (!profile.personaInquiryId) {
      return {
        configured: true,
        inquiryId: null,
        status: null,
        verified: profile.representativeIdentityVerified,
      };
    }

    const inquiry = await this.fetchInquiry(profile.personaInquiryId);
    const status = inquiry.attributes?.status || 'unknown';
    const approved = status === 'approved';
    const failureReason =
      ['declined', 'failed'].includes(status)
        ? inquiry.attributes?.['reviewer-comment'] || inquiry.attributes?.note || status
        : null;

    await this.prisma.organizerProfile.update({
      where: { id: profile.id },
      data: {
        identityProvider: 'PERSONA',
        personaInquiryStatus: status,
        representativeIdentityVerified: approved,
        personaIdentityVerifiedAt: approved ? profile.personaIdentityVerifiedAt || new Date() : profile.personaIdentityVerifiedAt,
        personaIdentityFailureReason: failureReason,
      },
    });

    return {
      configured: true,
      inquiryId: inquiry.id,
      status,
      verified: approved,
      failureReason,
    };
  }

  isConfigured() {
    return Boolean(this.apiKey && this.templateId && this.environmentId);
  }

  private verifySignature(rawBody: Buffer, signatureHeader?: string) {
    if (!this.webhookSecret || !signatureHeader || !rawBody?.length) return false;

    const pairs = signatureHeader.split(' ').map((part) => part.trim()).filter(Boolean);
    const timestamp = pairs[0]?.split(',')[0]?.split('=')[1];
    if (!timestamp) return false;

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');

    return pairs.some((pair) => {
      const match = pair.match(/(?:^|,)v1=([^,\s]+)/);
      if (!match) return false;
      const supplied = match[1];
      if (supplied.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    });
  }

  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined, body: any) {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('PERSONA_WEBHOOK_SECRET is not configured');
    }
    if (!this.verifySignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid Persona webhook signature');
    }

    const eventId = body?.data?.id as string | undefined;
    const eventName = body?.data?.attributes?.name as string | undefined;
    const eventCreatedAt = body?.data?.attributes?.['created-at'] as string | undefined;
    const inquiry = body?.data?.attributes?.payload?.data as PersonaInquiry | undefined;
    const inquiryId = inquiry?.id;
    const status = inquiry?.attributes?.status;

    if (!eventId || !eventName) return { received: true, ignored: true };

    const existing = await this.prisma.personaWebhookEvent.findUnique({ where: { eventId } });
    if (existing) return { received: true, duplicate: true };

    const profile = inquiryId
      ? await this.prisma.organizerProfile.findUnique({ where: { personaInquiryId: inquiryId } })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.personaWebhookEvent.create({
        data: {
          eventId,
          eventName,
          inquiryId: inquiryId || null,
          organizerId: profile?.id || null,
          processedAt: new Date(),
        },
      });

      if (!profile || !inquiryId) return;

      const incomingAt = eventCreatedAt ? new Date(eventCreatedAt) : new Date();
      if (profile.personaLastEventAt && profile.personaLastEventAt > incomingAt) return;

      const data: Record<string, unknown> = {
        identityProvider: 'PERSONA',
        personaInquiryStatus: status || eventName.replace('inquiry.', ''),
        personaLastEventAt: incomingAt,
      };

      if (eventName === 'inquiry.approved') {
        data.representativeIdentityVerified = true;
        data.personaIdentityVerifiedAt = new Date();
        data.personaIdentityFailureReason = null;
      }

      if (eventName === 'inquiry.declined' || eventName === 'inquiry.failed') {
        data.representativeIdentityVerified = false;
        data.personaIdentityFailureReason =
          inquiry?.attributes?.['reviewer-comment'] ||
          inquiry?.attributes?.note ||
          (eventName === 'inquiry.declined' ? 'Persona declined this identity verification.' : 'Persona verification failed.');
      }

      await tx.organizerProfile.update({ where: { id: profile.id }, data });
    });

    if (profile) {
      await this.auditLogs.log({
        action: 'PERSONA_WEBHOOK_PROCESSED',
        entityType: 'OrganizerProfile',
        entityId: profile.id,
        metadata: { eventId, eventName, inquiryId, status },
      });
    }

    return { received: true };
  }
}
