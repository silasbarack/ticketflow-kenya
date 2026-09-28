import { Body, Controller, Get, Param, Patch, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizersService } from './organizers.service';
import { UpdateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { UpdateCompanyVerificationDto, UpdatePayoutVerificationDto, UpdateRepresentativeVerificationDto, UpdateVerificationDocumentsDto } from './dto/organizer-verification.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';

@Controller('organizers')
@UseGuards(RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizersController {
  constructor(private organizersService: OrganizersService) {}

  @Get('me') getProfile(@CurrentUser() user: AuthenticatedUser) { return this.organizersService.getProfileByUserId(user.userId); }
  @Patch('me') updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizerProfileDto) { return this.organizersService.updateProfile(user.userId, dto); }
  @Get('me/verification') getVerification(@CurrentUser() user: AuthenticatedUser) { return this.organizersService.getVerificationByUserId(user.userId); }
  @Patch('me/verification/company') updateCompany(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCompanyVerificationDto) { return this.organizersService.updateVerificationCompany(user.userId, dto); }
  @Patch('me/verification/documents') updateDocuments(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVerificationDocumentsDto) { return this.organizersService.updateVerificationDocuments(user.userId, dto); }

  @Post('me/verification/documents/:kind/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('kind') kind: string,
    @UploadedFile() file: any,
  ) {
    return this.organizersService.uploadVerificationDocument(user.userId, kind, file);
  }

  @Get('me/verification/documents/:kind/file')
  async getVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('kind') kind: string,
  ) {
    const document = await this.organizersService.getOwnVerificationDocument(user.userId, kind);
    return new StreamableFile(document.data, {
      type: document.mimeType,
      disposition: `inline; filename="${document.fileName.replace(/"/g, '')}"`,
      length: document.sizeBytes,
    });
  }
  @Patch('me/verification/representative') updateRepresentative(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRepresentativeVerificationDto) { return this.organizersService.updateVerificationRepresentative(user.userId, dto); }
  @Patch('me/verification/payout') updatePayout(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePayoutVerificationDto) { return this.organizersService.updateVerificationPayout(user.userId, dto); }
  @Post('me/verification/submit') submit(@CurrentUser() user: AuthenticatedUser) { return this.organizersService.submitVerification(user.userId); }
  @Get('me/dashboard') getDashboard(@CurrentUser() user: AuthenticatedUser) { return this.organizersService.getDashboardStats(user.userId); }
}
