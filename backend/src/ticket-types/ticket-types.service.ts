import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Injectable()
export class TicketTypesService {
  constructor(private prisma: PrismaService) {}

  private async assertEventOwnership(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizer.userId !== userId) throw new ForbiddenException('You do not own this event');
    return event;
  }

  async create(userId: string, eventId: string, dto: CreateTicketTypeDto) {
    await this.assertEventOwnership(eventId, userId);
    return this.prisma.ticketType.create({
      data: {
        eventId,
        name: dto.name,
        category: dto.category as any,
        price: dto.price,
        quantity: dto.quantity,
        description: dto.description,
      },
    });
  }

  async findAllForEvent(eventId: string) {
    return this.prisma.ticketType.findMany({ where: { eventId }, orderBy: { price: 'asc' } });
  }

  async update(userId: string, id: string, dto: UpdateTicketTypeDto) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: { event: { include: { organizer: true } } },
    });
    if (!ticketType) throw new NotFoundException('Ticket type not found');
    if (ticketType.event.organizer.userId !== userId) throw new ForbiddenException('You do not own this event');

    if (dto.quantity !== undefined && dto.quantity < ticketType.quantitySold) {
      throw new BadRequestException('Quantity cannot be less than tickets already sold');
    }

    return this.prisma.ticketType.update({
      where: { id },
      data: { ...dto, category: dto.category as any },
    });
  }

  async remove(userId: string, id: string) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: { event: { include: { organizer: true } } },
    });
    if (!ticketType) throw new NotFoundException('Ticket type not found');
    if (ticketType.event.organizer.userId !== userId) throw new ForbiddenException('You do not own this event');
    if (ticketType.quantitySold > 0) {
      throw new BadRequestException('Cannot delete a ticket type that already has sales');
    }

    await this.prisma.ticketType.delete({ where: { id } });
    return { message: 'Ticket type deleted' };
  }
}
