import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ResearchHoursService } from './research-hours.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('research-hours')
export class ResearchHoursController {
  constructor(private svc: ResearchHoursService) {}

  /** Tính và lấy giờ chuẩn NCKH của user hiện tại */
  @Get('my')
  getMyHours(
    @CurrentUser('id') userId: number,
    @Query('year') year?: string,
  ) {
    const academicYear = year || this.getCurrentAcademicYear();
    return this.svc.calculate(userId, academicYear);
  }

  /** Tính giờ chuẩn cho user cụ thể (Admin) */
  @Post('calculate')
  @Roles(Role.ADMIN)
  calculate(
    @Body('userId') userId: number,
    @Body('academicYear') academicYear: string,
  ) {
    return this.svc.calculate(userId, academicYear);
  }

  /** Bảng tổng hợp giờ chuẩn toàn trường (Admin) */
  @Get('summary')
  @Roles(Role.ADMIN)
  getSummary(@Query('year') year?: string) {
    return this.svc.getSummary(year || this.getCurrentAcademicYear());
  }

  /** Tìm kiếm danh mục tạp chí */
  @Get('journals')
  getJournals(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.svc.getJournalRankings(search, category);
  }

  /** Thêm tạp chí vào danh mục (Admin) */
  @Post('journals')
  @Roles(Role.ADMIN)
  createJournal(@Body() data: {
    name: string; issn?: string; publisher?: string; category?: string;
    quartile?: string; impactFactor?: number; points: number; country?: string; url?: string;
  }) {
    return this.svc.createJournalRanking(data);
  }

  private getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  }
}
