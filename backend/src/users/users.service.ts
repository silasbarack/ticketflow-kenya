import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { organizerProfile: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.sanitize(user);
  }

  async findAll(params: { role?: string; take?: number; skip?: number }) {
    const users = await this.prisma.user.findMany({
      where: params.role ? { role: params.role as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
      include: { organizerProfile: true },
    });
    return users.map((u) => this.sanitize(u));
  }
}
