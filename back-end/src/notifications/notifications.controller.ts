import { Controller, Get, Patch, Param, Query, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query('unread') unread?: string) {
    return this.svc.findAll(userId, unread === 'true');
  }

  @Get('count')
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.svc.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.svc.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: number) {
    return this.svc.markAllAsRead(userId);
  }
}
