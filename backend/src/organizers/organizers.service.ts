import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateOrganizerProfileDto } from './dto/create-organizer-profile.dto';

@Injectable()
export class OrganizersService {
  constructor(private prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Organizer profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateOrganizerProfileDto) {
    const profile = await this.getProfileByUserId(userId);
    return this.prisma.organizerProfile.update({ where: { id: profile.id }, data: dto });
  }

  async getDashboardStats(userId: string) {
    const profile = await this.getProfileByUserId(userId);

    const events = await this.prisma.event.findMany({
      where: { organizerId: profile.id },
      include: { ticketTypes: true },
    });

    const eventIds = events.map((e) => e.id);

    const orders = await this.prisma.order.findMany({
      where: { eventId: { in: eventIds }, status: 'PAID' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrganizerEarning = orders.reduce((sum, o) => sum + Number(o.organizerEarning), 0);
    const ticketsSold = events.reduce(
      (sum, e) => sum + e.ticketTypes.reduce((s, tt) => s + tt.quantitySold, 0),
      0,
    );

    return {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
      pendingEvents: events.filter((e) => e.status === 'PENDING_APPROVAL').length,
      ticketsSold,
      totalRevenue,
      totalOrganizerEarning,
      totalOrders: orders.length,
    };
  }
}
