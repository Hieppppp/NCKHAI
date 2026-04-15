import { Module } from '@nestjs/common';
import { ResearchHoursController } from './research-hours.controller.js';
import { ResearchHoursService } from './research-hours.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResearchHoursController],
  providers: [ResearchHoursService],
  exports: [ResearchHoursService],
})
export class ResearchHoursModule {}
