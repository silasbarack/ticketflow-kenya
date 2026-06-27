import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private async getOrganizerProfile(userId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Organizer profile not found for this user');
    return profile;
  }

  private async getOwnedEvent(eventId: string, organizerProfileId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerProfileId) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  async create(userId: string, dto: CreateEventDto) {
    const profile = await this.getOrganizerProfile(userId);

    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);
    if (end <= start) {
      throw new BadRequestException('endDateTime must be after startDateTime');
    }

    const event = await this.prisma.event.create({
      data: {
        organizerId: profile.id,
        categoryId: dto.categoryId,
        title: dto.title,
        slug: slugify(dto.title),
        description: dto.description,
        posterUrl: dto.posterUrl,
        venue: dto.venue,
        city: dto.city,
        address: dto.address,
        startDateTime: start,
        endDateTime: end,
      },
    });

    await this.auditLogsService.log({
      actorId: userId,
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
    });

    return event;
  }

  async findPublic(query: QueryEventsDto) {
    const take = query.take ? parseInt(query.take, 10) : 20;
    const skip = query.skip ? parseInt(query.skip, 10) : 0;

    const where: any = {
      status: 'PUBLISHED',
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.fromDate || query.toDate) {
      where.startDateTime = {};
      if (query.fromDate) where.startDateTime.gte = new Date(query.fromDate);
      if (query.toDate) where.startDateTime.lte = new Date(query.toDate);
    }
    if (query.minPrice || query.maxPrice) {
      where.ticketTypes = {
        some: {
          ...(query.minPrice ? { price: { gte: parseFloat(query.minPrice) } } : {}),
          ...(query.maxPrice ? { price: { lte: parseFloat(query.maxPrice) } } : {}),
        },
      };
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: { category: true, ticketTypes: true, organizer: { select: { companyName: true } } },
        orderBy: { startDateTime: 'asc' },
        take,
        skip,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { events, total, take, skip };
  }

  async findOnePublic(idOrSlug: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: 'PUBLISHED',
      },
      include: { category: true, ticketTypes: true, organizer: { select: { companyName: true, description: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async findOneForOrganizer(userId: string, id: string) {
    const profile = await this.getOrganizerProfile(userId);
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { category: true, ticketTypes: true },
    });
    if (!event || event.organizerId !== profile.id) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async findAllForOrganizer(userId: string) {
    const profile = await this.getOrganizerProfile(userId);
    return this.prisma.event.findMany({
      where: { organizerId: profile.id },
      include: { category: true, ticketTypes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Attendee roster for an organizer's event — backs the attendees page and CSV export. */
  async getAttendees(userId: string, eventId: string) {
    const profile = await this.getOrganizerProfile(userId);
    await this.getOwnedEvent(eventId, profile.id);

    const tickets = await this.prisma.ticket.findMany({
      where: { order: { eventId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        ticketType: { select: { name: true, category: true } },
        checkIn: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      ticketCode: t.ticketCode,
      attendeeName: `${t.user.firstName} ${t.user.lastName}`,
      email: t.user.email,
      phone: t.user.phone,
      ticketType: t.ticketType.name,
      category: t.ticketType.category,
      status: t.status,
      checkedInAt: t.checkIn?.checkedInAt ?? null,
      purchasedAt: t.createdAt,
    }));
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const profile = await this.getOrganizerProfile(userId);
    const event = await this.getOwnedEvent(id, profile.id);

    if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
      throw new BadRequestException('Cannot edit a cancelled or completed event');
    }

    const data: any = { ...dto };
    if (dto.startDateTime) data.startDateTime = new Date(dto.startDateTime);
    if (dto.endDateTime) data.endDateTime = new Date(dto.endDateTime);

    // Editing a published event sends it back for re-approval.
    if (event.status === 'PUBLISHED') {
      data.status = 'PENDING_APPROVAL';
    }

    return this.prisma.event.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const profile = await this.getOrganizerProfile(userId);
    const event = await this.getOwnedEvent(id, profile.id);

    if (event.status === 'PUBLISHED') {
      throw new BadRequestException('Published events must be cancelled, not deleted');
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted' };
  }

  async submitForApproval(userId: string, id: string) {
    const profile = await this.getOrganizerProfile(userId);
    const event = await this.getOwnedEvent(id, profile.id);

    if (!['DRAFT', 'REJECTED'].includes(event.status)) {
      throw new BadRequestException('Only draft or rejected events can be submitted for approval');
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL', rejectionReason: null },
    });
  }

  async cancel(userId: string, id: string) {
    const profile = await this.getOrganizerProfile(userId);
    const event = await this.getOwnedEvent(id, profile.id);

    if (event.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed event');
    }

    const updated = await this.prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });

    await this.auditLogsService.log({
      actorId: userId,
      action: 'EVENT_CANCELLED',
      entityType: 'Event',
      entityId: id,
    });

    return updated;
  }

  // --- Admin actions ---

  async publish(adminId: string, id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only events pending approval can be published');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED', rejectionReason: null },
    });

    await this.auditLogsService.log({
      actorId: adminId,
      action: 'EVENT_APPROVED',
      entityType: 'Event',
      entityId: id,
    });

    return updated;
  }

  async reject(adminId: string, id: string, reason?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only events pending approval can be rejected');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || 'Did not meet platform guidelines' },
    });

    await this.auditLogsService.log({
      actorId: adminId,
      action: 'EVENT_REJECTED',
      entityType: 'Event',
      entityId: id,
      metadata: { reason },
    });

    return updated;
  }
}
