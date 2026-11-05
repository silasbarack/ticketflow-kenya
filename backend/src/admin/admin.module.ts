import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EventsModule } from '../events/events.module';
import { OrganizersModule } from '../organizers/organizers.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({
  imports: [EventsModule, OrganizersModule, AuditLogsModule],
  providers: [AdminService, AdminBootstrapService],
  controllers: [AdminController],
})
export class AdminModule {}
