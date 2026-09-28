import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EventsModule } from '../events/events.module';
import { OrganizersModule } from '../organizers/organizers.module';

@Module({
  imports: [EventsModule, OrganizersModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
