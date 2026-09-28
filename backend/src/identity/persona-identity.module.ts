import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PersonaIdentityController } from './persona-identity.controller';
import { PersonaIdentityService } from './persona-identity.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [PersonaIdentityController],
  providers: [PersonaIdentityService],
  exports: [PersonaIdentityService],
})
export class PersonaIdentityModule {}
