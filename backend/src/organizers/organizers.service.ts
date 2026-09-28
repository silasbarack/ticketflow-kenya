import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  UpdateCompanyVerificationDto,
  UpdatePayoutVerificationDto,
  UpdateRepresentativeVerificationDto,
  UpdateVerificationDocumentsDto,
} from './dto/organizer-verification.dto';

const EDITABLE_STATUSES = ['NOT_STARTED','IN_PROGRESS','CHANGES_REQUIRED','REJECTED'];

@Injectable()
export class OrganizersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Organizer profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateOrganizerProfileDto) {
    const profile = await this.getProfileByUserId(userId);
    return this.prisma.organizerProfile.update({ where: { id: profile.id }, data: dto });
  }

  private assertEditable(status: string) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(status === 'VERIFIED'
        ? 'Verified legal details are locked. Contact TicketFlow support to change them.'
        : 'This verification is currently under review and cannot be edited.');
    }
  }

  private view(profile: any) {
    const company = Boolean(profile.legalBusinessName && profile.registrationNumber && profile.businessAddress && profile.companyEmail && profile.companyPhone);
    const documents = Boolean(profile.certificateOfIncorporationUrl && profile.officialSearchUrl && profile.kraPinCertificateUrl);
    const representative = Boolean(profile.representativeFullName && profile.representativeRole && profile.representativeIdLast4 && profile.representativeIdDocumentUrl);
    const payout = Boolean(profile.payoutMethod && profile.payoutAccountName && profile.payoutReference && profile.payoutProofUrl);
    return {
      id: profile.id,
      companyName: profile.companyName,
      isVerified: profile.isVerified,
      verificationStatus: profile.verificationStatus,
      legalBusinessName: profile.legalBusinessName,
      registrationNumber: profile.registrationNumber,
      businessAddress: profile.businessAddress,
      companyEmail: profile.companyEmail,
      companyPhone: profile.companyPhone,
      certificateOfIncorporationUrl: profile.certificateOfIncorporationUrl,
      officialSearchUrl: profile.officialSearchUrl,
      kraPinCertificateUrl: profile.kraPinCertificateUrl,
      representativeFullName: profile.representativeFullName,
      representativeRole: profile.representativeRole,
      representativeIdLast4: profile.representativeIdLast4,
      representativeIdDocumentUrl: profile.representativeIdDocumentUrl,
      authorizationLetterUrl: profile.authorizationLetterUrl,
      payoutMethod: profile.payoutMethod,
      payoutAccountName: profile.payoutAccountName,
      payoutReference: profile.payoutReference,
      payoutProofUrl: profile.payoutProofUrl,
      verificationSubmittedAt: profile.verificationSubmittedAt,
      verificationReviewedAt: profile.verificationReviewedAt,
      verificationReviewNote: profile.verificationReviewNote,
      steps: { company, documents, representative, payout },
      canSubmit: company && documents && representative && payout,
    };
  }

  private async updateVerification(id: string, data: Record<string, unknown>) {
    const updated = await this.prisma.organizerProfile.update({
      where: { id },
      data: {
        ...data,
        isVerified: false,
        verificationStatus: 'IN_PROGRESS',
        verificationSubmittedAt: null,
        verificationReviewedAt: null,
        verificationReviewedBy: null,
        verificationReviewNote: null,
      },
    });
    return this.view(updated);
  }

  async getVerificationByUserId(userId: string) {
    return this.view(await this.getProfileByUserId(userId));
  }

  async updateVerificationCompany(userId: string, dto: UpdateCompanyVerificationDto) {
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    return this.updateVerification(profile.id, {
      legalBusinessName: dto.legalBusinessName.trim(),
      registrationNumber: dto.registrationNumber.trim(),
      businessAddress: dto.businessAddress.trim(),
      companyEmail: dto.companyEmail.trim().toLowerCase(),
      companyPhone: dto.companyPhone.trim(),
    });
  }

  async updateVerificationDocuments(userId: string, dto: UpdateVerificationDocumentsDto) {
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    return this.updateVerification(profile.id, dto);
  }

  async updateVerificationRepresentative(userId: string, dto: UpdateRepresentativeVerificationDto) {
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    return this.updateVerification(profile.id, {
      representativeFullName: dto.representativeFullName.trim(),
      representativeRole: dto.representativeRole.trim(),
      representativeIdLast4: dto.representativeIdLast4.trim(),
      representativeIdDocumentUrl: dto.representativeIdDocumentUrl,
      authorizationLetterUrl: dto.authorizationLetterUrl || null,
    });
  }

  async updateVerificationPayout(userId: string, dto: UpdatePayoutVerificationDto) {
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    return this.updateVerification(profile.id, {
      payoutMethod: dto.payoutMethod,
      payoutAccountName: dto.payoutAccountName.trim(),
      payoutReference: dto.payoutReference.trim(),
      payoutProofUrl: dto.payoutProofUrl,
    });
  }

  async submitVerification(userId: string) {
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    const current = this.view(profile);
    if (!current.canSubmit) throw new BadRequestException('Complete all verification sections before submitting.');
    const updated = await this.prisma.organizerProfile.update({
      where: { id: profile.id },
      data: { isVerified: false, verificationStatus: 'SUBMITTED', verificationSubmittedAt: new Date(), verificationReviewNote: null },
    });
    await this.auditLogs.log({
      actorId: userId,
      action: 'ORGANIZER_VERIFICATION_SUBMITTED',
      entityType: 'OrganizerProfile',
      entityId: profile.id,
      metadata: { verificationStatus: updated.verificationStatus },
    });
    return this.view(updated);
  }

  async listVerificationsForAdmin(status?: string) {
    const allowed = ['NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','VERIFIED','REJECTED'];
    if (status && !allowed.includes(status)) throw new BadRequestException('Invalid verification status');
    return this.prisma.organizerProfile.findMany({
      where: status ? { verificationStatus: status as any } : undefined,
      include: { user: { select: { firstName:true,lastName:true,email:true,phone:true,isActive:true } } },
      orderBy: [{ verificationSubmittedAt:'desc' }, { updatedAt:'desc' }],
    });
  }

  async getVerificationForAdmin(organizerId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: { user: { select: { firstName:true,lastName:true,email:true,phone:true,isActive:true } } },
    });
    if (!profile) throw new NotFoundException('Organizer not found');
    return { ...this.view(profile), user: profile.user };
  }

  async markUnderReview(adminId: string, organizerId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { id: organizerId } });
    if (!profile) throw new NotFoundException('Organizer not found');
    if (profile.verificationStatus !== 'SUBMITTED') throw new BadRequestException('Only submitted applications can be moved under review');
    const updated = await this.prisma.organizerProfile.update({
      where: { id: organizerId },
      data: { verificationStatus:'UNDER_REVIEW', verificationReviewedBy:adminId },
    });
    await this.auditLogs.log({
      actorId: adminId,
      action: 'ORGANIZER_VERIFICATION_REVIEW_STARTED',
      entityType: 'OrganizerProfile',
      entityId: organizerId,
    });
    return this.view(updated);
  }

  async approveVerification(adminId: string, organizerId: string, note?: string) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { id: organizerId } });
    if (!profile) throw new NotFoundException('Organizer not found');
    if (!['SUBMITTED','UNDER_REVIEW'].includes(profile.verificationStatus)) throw new BadRequestException('Application is not ready for approval');
    const updated = await this.prisma.organizerProfile.update({
      where: { id: organizerId },
      data: { verificationStatus:'VERIFIED', isVerified:true, verificationReviewedAt:new Date(), verificationReviewedBy:adminId, verificationReviewNote:note || null },
    });
    await this.auditLogs.log({
      actorId: adminId,
      action: 'ORGANIZER_VERIFICATION_APPROVED',
      entityType: 'OrganizerProfile',
      entityId: organizerId,
      metadata: { noteProvided: Boolean(note?.trim()) },
    });
    return this.view(updated);
  }

  async requestVerificationChanges(adminId: string, organizerId: string, note?: string) {
    if (!note?.trim()) throw new BadRequestException('Explain what the organizer needs to change');
    const profile = await this.prisma.organizerProfile.findUnique({ where: { id: organizerId } });
    if (!profile) throw new NotFoundException('Organizer not found');
    const updated = await this.prisma.organizerProfile.update({
      where: { id: organizerId },
      data: { verificationStatus:'CHANGES_REQUIRED', isVerified:false, verificationReviewedAt:new Date(), verificationReviewedBy:adminId, verificationReviewNote:note.trim() },
    });
    await this.auditLogs.log({
      actorId: adminId,
      action: 'ORGANIZER_VERIFICATION_CHANGES_REQUESTED',
      entityType: 'OrganizerProfile',
      entityId: organizerId,
      metadata: { noteProvided: true },
    });
    return this.view(updated);
  }

  async rejectVerification(adminId: string, organizerId: string, note?: string) {
    if (!note?.trim()) throw new BadRequestException('Provide a rejection reason');
    const profile = await this.prisma.organizerProfile.findUnique({ where: { id: organizerId } });
    if (!profile) throw new NotFoundException('Organizer not found');
    const updated = await this.prisma.organizerProfile.update({
      where: { id: organizerId },
      data: { verificationStatus:'REJECTED', isVerified:false, verificationReviewedAt:new Date(), verificationReviewedBy:adminId, verificationReviewNote:note.trim() },
    });
    await this.auditLogs.log({
      actorId: adminId,
      action: 'ORGANIZER_VERIFICATION_REJECTED',
      entityType: 'OrganizerProfile',
      entityId: organizerId,
      metadata: { noteProvided: true },
    });
    return this.view(updated);
  }

  async getDashboardStats(userId: string) {
    const profile = await this.getProfileByUserId(userId);
    const events = await this.prisma.event.findMany({ where: { organizerId: profile.id }, include: { ticketTypes: true } });
    const orders = await this.prisma.order.findMany({ where: { eventId: { in: events.map(e => e.id) }, status:'PAID' } });
    return {
      totalEvents: events.length,
      publishedEvents: events.filter(e => e.status === 'PUBLISHED').length,
      pendingEvents: events.filter(e => e.status === 'PENDING_APPROVAL').length,
      ticketsSold: events.reduce((sum,e) => sum + e.ticketTypes.reduce((s,t) => s + t.quantitySold,0),0),
      totalRevenue: orders.reduce((sum,o) => sum + Number(o.totalAmount),0),
      totalOrganizerEarning: orders.reduce((sum,o) => sum + Number(o.organizerEarning),0),
      totalOrders: orders.length,
    };
  }
}
