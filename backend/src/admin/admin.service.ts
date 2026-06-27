import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalOrganizers, totalCustomers, totalEvents, publishedEvents, pendingEvents, totalOrders, successfulPayments] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'ORGANIZER' } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.event.count(),
        this.prisma.event.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.event.count({ where: { status: 'PENDING_APPROVAL' } }),
        this.prisma.order.count({ where: { status: 'PAID' } }),
        this.prisma.payment.findMany({ where: { status: 'SUCCESS' } }),
      ]);

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const commissions = await this.prisma.platformCommission.findMany();
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    const ticketsSold = await this.prisma.ticket.count();
    const ticketsCheckedIn = await this.prisma.checkIn.count();

    return {
      totalUsers,
      totalOrganizers,
      totalCustomers,
      totalEvents,
      publishedEvents,
      pendingEvents,
      totalOrders,
      totalRevenue,
      totalCommission,
      ticketsSold,
      ticketsCheckedIn,
    };
  }

  async getAllUsers(params: { role?: string; take?: number; skip?: number }) {
    const users = await this.prisma.user.findMany({
      where: params.role ? { role: params.role as any } : undefined,
      include: { organizerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      skip: params.skip ?? 0,
    });
    return users.map(({ passwordHash, ...rest }) => rest);
  }

  async suspendUser(id: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async getAllEvents(params: { status?: string; take?: number; skip?: number }) {
    return this.prisma.event.findMany({
      where: params.status ? { status: params.status as any } : undefined,
      include: { category: true, organizer: { include: { user: true } }, ticketTypes: true },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      skip: params.skip ?? 0,
    });
  }

  async suspendEvent(id: string) {
    return this.prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async getAllPayments(params: { status?: string; take?: number; skip?: number }) {
    return this.prisma.payment.findMany({
      where: params.status ? { status: params.status as any } : undefined,
      include: { order: { include: { event: true, user: true } } },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      skip: params.skip ?? 0,
    });
  }
}
