import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
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

  /** Lịch sử jobs của user (hoặc admin xem tất cả) */
  @Get()
  getMyJobs(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('queueName') queueName?: string,
    @Query('all') all?: string,
  ) {
    const isAdminView = all === 'true' && role === Role.ADMIN;
    return this.svc.listJobs({
      userId: isAdminView ? undefined : userId,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      status, queueName,
    });
  }

  /** Queue stats (Admin) */
  @Get('admin/stats')
  @Roles(Role.ADMIN)
  getStats() {
    return this.svc.getStats();
  }

  /** Retry failed job */
  @Post(':id/retry')
  @Roles(Role.ADMIN)
  retry(@Param('id') id: string) {
    return this.svc.retryJob(id);
  }

  /** Remove job record */
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.svc.removeJob(id);
  }

  /** Clean queues - old completed/failed jobs */
  @Post('admin/clean')
  @Roles(Role.ADMIN)
  clean(@Body('olderThanHours') hours?: number) {
    return this.svc.cleanOldJobs(hours || 24);
  }

  /** Test endpoint: tạo job thử cho từng loại queue (Admin) */
  @Post('admin/seed-test')
  @Roles(Role.ADMIN)
  async seedTestJobs(
    @Body('type') type: 'ocr' | 'summarize' | 'embedding' | 'email' | 'report' | 'all',
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.seedTestJobs(type || 'all', userId);
  }
}
