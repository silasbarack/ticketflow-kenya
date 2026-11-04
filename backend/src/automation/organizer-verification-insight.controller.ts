import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { explainVerification } from './verification-automation.service';

@UseGuards(RolesGuard)
@Roles(Role.ORGANIZER)
@Controller('organizers/me/verification')
export class OrganizerVerificationInsightController {
  constructor(private readonly prisma: PrismaService) {}

  /** Plain-language status built from Persona's and the reviewer's recorded results. */
  @Get('explanation')
  async explanation(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) throw new NotFoundException('Organizer profile not found');
    return explainVerification(profile);
  }
}
