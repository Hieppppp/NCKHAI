import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats(@CurrentUser('id') userId: number, @CurrentUser('role') role: string) {
    const isAdmin = role === 'ADMIN';

    // Admin: dùng PostgreSQL function (1 query thay vì 7)
    if (isAdmin) {
      try {
        const result: any[] = await (this.prisma as any).$queryRaw`SELECT get_dashboard_stats() AS data`;
        if (result?.[0]?.data) return result[0].data;
      } catch {
        // Fallback nếu function chưa tạo
      }
    }

    // Non-admin hoặc fallback: queries riêng lẻ (filter theo userId)
    const baseWhere = isAdmin ? {} : { userId };

    const [totalWorks, byStatus, byType, byLevel, recentWorks, totalUsers, pendingReviews] = await Promise.all([
      this.prisma.scientificWork.count({ where: baseWhere }),
      this.prisma.scientificWork.groupBy({ by: ['status'], where: baseWhere, _count: { status: true } }),
      this.prisma.scientificWork.groupBy({ by: ['type'], where: baseWhere, _count: { type: true } }),
      this.prisma.scientificWork.groupBy({ by: ['level'], where: baseWhere, _count: { level: true } }),
      this.prisma.scientificWork.findMany({
        where: baseWhere,
        select: { id: true, title: true, authors: true, status: true, type: true, level: true, createdAt: true, aiScore: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, take: 10,
      }),
      isAdmin ? this.prisma.user.count() : Promise.resolve(0),
      this.prisma.scientificWork.count({ where: { ...baseWhere, status: { in: ['SUBMITTED', 'REVIEW', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW'] } } }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count.status]));
    const typeMap = Object.fromEntries(byType.map((t) => [t.type, t._count.type]));
    const levelMap = Object.fromEntries(byLevel.map((l) => [l.level, l._count.level]));

    return { totalWorks, pendingReviews, accepted: statusMap['ACCEPTED'] || 0, totalUsers, byStatus: statusMap, byType: typeMap, byLevel: levelMap, recentWorks };
  }
}
