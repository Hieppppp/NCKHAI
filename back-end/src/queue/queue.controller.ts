import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QueueService } from './queue.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('jobs')
export class QueueController {
  constructor(private svc: QueueService) {}

  /** Xem job theo ID (polling từ frontend) */
  @Get(':id')
  getJob(@Param('id') id: string) {
    return this.svc.getJobStatus(id);
  }

  /** Lịch sử jobs của user */
  @Get()
  getMyJobs(
    @CurrentUser('id') userId: number,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getUserJobs(userId, limit ? +limit : 20);
  }

  /** Queue stats (Admin) */
  @Get('admin/stats')
  @Roles(Role.ADMIN)
  getStats() {
    return this.svc.getStats();
  }
}
