import { Module } from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { OrganizersController } from './organizers.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [OrganizersService],
  controllers: [OrganizersController],
  exports: [OrganizersService],
})
export class OrganizersModule {}
