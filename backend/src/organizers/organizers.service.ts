import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OrganizerVerificationDocumentKind } from '@prisma/client';
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

  private view(profile: any, uploadedDocuments: Array<{ kind: OrganizerVerificationDocumentKind; fileName: string; mimeType: string; sizeBytes: number; uploadedAt: Date }> = []) {
    const uploadedKinds = new Set(uploadedDocuments.map((document) => document.kind));
    const company = Boolean(profile.legalBusinessName && profile.registrationNumber && profile.businessAddress && profile.companyEmail && profile.companyPhone);
    const documents = uploadedKinds.has(OrganizerVerificationDocumentKind.INCORPORATION_CERTIFICATE)
      && uploadedKinds.has(OrganizerVerificationDocumentKind.OFFICIAL_SEARCH)
      && uploadedKinds.has(OrganizerVerificationDocumentKind.KRA_PIN_CERTIFICATE);
    const representative = Boolean(
      profile.representativeFullName
      && profile.representativeRole
      && profile.representativeIdLast4
      && uploadedKinds.has(OrganizerVerificationDocumentKind.REPRESENTATIVE_ID),
    );
    const payout = Boolean(
      profile.payoutMethod
      && profile.payoutAccountName
      && profile.payoutReference
      && uploadedKinds.has(OrganizerVerificationDocumentKind.PAYOUT_PROOF),
    );
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
      documents: uploadedDocuments.map((document) => ({
        kind: document.kind,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        uploadedAt: document.uploadedAt,
      })),
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
    const profile = await this.getProfileByUserId(userId);
    const documents = await this.prisma.organizerVerificationDocument.findMany({
      where: { organizerId: profile.id },
      select: { kind: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
      orderBy: { uploadedAt: 'asc' },
    });
    return this.view(profile, documents);
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
    return this.updateVerification(profile.id, {
      certificateOfIncorporationUrl: dto.certificateOfIncorporationUrl,
      officialSearchUrl: dto.officialSearchUrl,
      kraPinCertificateUrl: dto.kraPinCertificateUrl,
    });
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
    const documents = await this.prisma.organizerVerificationDocument.findMany({
      where: { organizerId: profile.id },
      select: { kind: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
    });
    const current = this.view(profile, documents);
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

  private parseDocumentKind(kind: string): OrganizerVerificationDocumentKind {
    if (!Object.values(OrganizerVerificationDocumentKind).includes(kind as OrganizerVerificationDocumentKind)) {
      throw new BadRequestException('Unsupported verification document type');
    }
    return kind as OrganizerVerificationDocumentKind;
  }

  async uploadVerificationDocument(userId: string, kindInput: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a document to upload');
    const profile = await this.getProfileByUserId(userId);
    this.assertEditable(profile.verificationStatus);
    const kind = this.parseDocumentKind(kindInput);
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPEG and PNG files are accepted');
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Verification documents must be 5 MB or smaller');
    }

    const safeName = (file.originalname || 'document')
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .slice(0, 120);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const document = await this.prisma.organizerVerificationDocument.upsert({
      where: { organizerId_kind: { organizerId: profile.id, kind } },
      update: {
        fileName: safeName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sha256,
        data: file.buffer,
        uploadedAt: new Date(),
      },
      create: {
        organizerId: profile.id,
        kind,
        fileName: safeName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sha256,
        data: file.buffer,
      },
      select: { kind: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
    });

    await this.prisma.organizerProfile.update({
      where: { id: profile.id },
      data: {
        isVerified: false,
        verificationStatus: 'IN_PROGRESS',
        verificationSubmittedAt: null,
        verificationReviewedAt: null,
        verificationReviewedBy: null,
        verificationReviewNote: null,
      },
    });

    await this.auditLogs.log({
      actorId: userId,
      action: 'ORGANIZER_VERIFICATION_DOCUMENT_UPLOADED',
      entityType: 'OrganizerProfile',
      entityId: profile.id,
      metadata: { kind, sizeBytes: file.size, mimeType: file.mimetype, sha256 },
    });

    return document;
  }

  async getOwnVerificationDocument(userId: string, kindInput: string) {
    const profile = await this.getProfileByUserId(userId);
    return this.getVerificationDocument(profile.id, kindInput);
  }

  async getVerificationDocument(organizerId: string, kindInput: string) {
    const kind = this.parseDocumentKind(kindInput);
    const document = await this.prisma.organizerVerificationDocument.findUnique({
      where: { organizerId_kind: { organizerId, kind } },
    });
    if (!document) throw new NotFoundException('Verification document not found');
    return document;
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
    const documents = await this.prisma.organizerVerificationDocument.findMany({
      where: { organizerId },
      select: { kind: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
      orderBy: { uploadedAt: 'asc' },
    });
    return { ...this.view(profile, documents), user: profile.user };
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
