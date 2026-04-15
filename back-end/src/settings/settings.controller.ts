import { Controller, Get, Post, Patch, Body, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  /** Lấy tất cả cấu hình hệ thống */
  @Get('system')
  @Roles(Role.ADMIN)
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  /** Lấy cấu hình theo nhóm */
  @Get('system/group')
  @Roles(Role.ADMIN)
  getConfigsByGroup(@Query('group') group: string) {
    return this.svc.getConfigsByGroup(group || 'general');
  }

  /** Cập nhật nhiều cấu hình cùng lúc */
  @Patch('system')
  @Roles(Role.ADMIN)
  updateConfigs(@Body('configs') configs: { key: string; value: string }[]) {
    return this.svc.updateConfigs(configs);
  }

  /** Lấy preferences của user hiện tại */
  @Get('preferences')
  getUserPreferences(@CurrentUser('id') userId: number) {
    return this.svc.getUserPreferences(userId);
  }

  /** Cập nhật preferences */
  @Post('preferences')
  setUserPreferences(
    @CurrentUser('id') userId: number,
    @Body() prefs: Record<string, string>,
  ) {
    return this.svc.setUserPreferences(userId, prefs);
  }

  /** Lấy notification settings */
  @Get('notifications')
  getNotificationSettings(@CurrentUser('id') userId: number) {
    return this.svc.getNotificationSettings(userId);
  }

  /** Thông tin hệ thống */
  @Get('info')
  getSystemInfo() {
    return this.svc.getSystemInfo();
  }
}
