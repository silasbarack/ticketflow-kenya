import { Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PersonaIdentityService } from './persona-identity.service';

@Controller('identity/persona')
export class PersonaIdentityController {
  constructor(private readonly persona: PersonaIdentityService) {}

  @Post('inquiry')
  createOrResume(@CurrentUser() user: AuthenticatedUser) {
    return this.persona.getOrCreateInquiry(user.userId);
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.persona.refreshInquiryStatus(user.userId);
  }

  @Get('configuration')
  configuration() {
    return { configured: this.persona.isConfigured() };
  }

  @Public()
  @Post('webhook')
  webhook(
    @Req() request: any,
    @Headers('persona-signature') signature: string | undefined,
  ) {
    return this.persona.handleWebhook(request.rawBody, signature, request.body);
  }
}
