import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { callDbFunction, callDbTableFunction } from '../prisma/db-functions.js';

/**
 * Hệ số quy đổi điểm NCKH theo quy định Hội đồng Giáo sư Nhà nước
 * và Thông tư 20/2020/TT-BGDDT
 */
const PUBLICATION_POINTS: Record<string, Record<string, number>> = {
  // ISI/Scopus
  Q1: { main: 2.0, co: 1.5 },
  Q2: { main: 1.5, co: 1.0 },
  Q3: { main: 1.0, co: 0.75 },
  Q4: { main: 0.75, co: 0.5 },
  ESCI: { main: 0.75, co: 0.5 },
  // Trong nước
  HDGSNN: { main: 1.0, co: 0.5 },       // Tạp chí trong danh mục HĐGSNN
  DOMESTIC: { main: 0.5, co: 0.25 },      // Tạp chí trong nước khác
  CONFERENCE_INTL: { main: 0.75, co: 0.5 }, // Hội nghị quốc tế
  CONFERENCE_VN: { main: 0.25, co: 0.15 },  // Hội nghị trong nước
};

const PROJECT_POINTS: Record<string, number> = {
  STATE: 100,       // Cấp Nhà nước - chủ nhiệm
  MINISTRY: 50,     // Cấp Bộ - chủ nhiệm
  UNIVERSITY: 25,   // Cấp Trường - chủ nhiệm
};

const REVIEW_POINTS = 2;           // Mỗi đề tài phản biện
// const SUPERVISION_POINTS = 5;   // Hướng dẫn 1 sinh viên NCKH (chưa dùng)
const DEFAULT_REQUIRED = 50;       // Định mức giờ chuẩn NCKH/năm

@Injectable()
export class ResearchHoursService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tính điểm quy đổi cho 1 user trong 1 năm học
   * Ưu tiên dùng PostgreSQL function (nhanh hơn 3-5x)
   */
  async calculate(userId: number, academicYear: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    // PostgreSQL function (1 query thay 6)
    const rows = await callDbTableFunction<{
      publication_points: number; project_points: number; review_points: number;
      total_points: number; required_points: number; pub_count: number;
      project_count: number; review_count: number;
      completion_status: string; percentage: number;
    }>(this.prisma, 'fn_calculate_research_hours', userId, academicYear);

    if (rows?.[0]) {
      const r = rows[0];
      return {
        userId,
        academicYear,
        publicationPoints: r.publication_points,
        projectPoints: r.project_points,
        reviewPoints: r.review_points,
        totalPoints: r.total_points,
        requiredPoints: r.required_points,
        status: 'CALCULATING',
        completion: r.completion_status,
        percentage: r.percentage,
        details: {
          publications: [],
          projects: [],
          reviews: r.review_count,
          reviewPointsPerReview: REVIEW_POINTS,
        },
      };
    }

    // 1. Điểm từ Công bố khoa học
    const publications = await this.prisma.publication.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        createdAt: this.getYearRange(academicYear),
      },
      include: { work: { select: { type: true, level: true } } },
    });

    let pubPoints = 0;
    const pubDetails: { title: string; journal?: string; quartile?: string; points: number }[] = [];

    for (const pub of publications) {
      let pts = 0;
      // Lookup journal ranking
      if (pub.journalName) {
        const journal = await this.prisma.journalRanking.findFirst({
          where: {
            OR: [
              { name: { contains: pub.journalName, mode: 'insensitive' } },
              { issn: pub.issn || undefined },
            ],
            isActive: true,
          },
        });

        if (journal?.points) {
          pts = journal.points;
        } else if (journal?.quartile) {
          const q = PUBLICATION_POINTS[journal.quartile];
          pts = q ? q.main : 0.5;
        } else {
          pts = 0.5; // Tạp chí không xác định
        }
      } else if (pub.conferenceName) {
        pts = pub.doi ? PUBLICATION_POINTS.CONFERENCE_INTL.main : PUBLICATION_POINTS.CONFERENCE_VN.main;
      } else {
        pts = 0.25;
      }

      pubPoints += pts;
      pubDetails.push({ title: pub.title, journal: pub.journalName || pub.conferenceName || undefined, quartile: undefined, points: pts });
    }

    // 2. Điểm từ Đề tài NCKH (chủ nhiệm)
    const works = await this.prisma.scientificWork.findMany({
      where: {
        userId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'REVIEW'] },
        createdAt: this.getYearRange(academicYear),
      },
    });

    let projectPoints = 0;
    const projectDetails: { title: string; level: string; points: number }[] = [];

    for (const w of works) {
      const pts = PROJECT_POINTS[w.level] || 10;
      projectPoints += pts;
      projectDetails.push({ title: w.title, level: w.level, points: pts });
    }

    // 3. Điểm từ Phản biện
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewerId: userId,
        createdAt: this.getYearRange(academicYear),
      },
    });
    const reviewPoints = reviews.length * REVIEW_POINTS;

    // 4. Tổng hợp
    const totalPoints = pubPoints + projectPoints + reviewPoints;

    // Upsert ResearchHours record
    const record = await this.prisma.researchHours.upsert({
      where: { userId_academicYear: { userId, academicYear } },
      create: {
        userId,
        academicYear,
        publicationPoints: pubPoints,
        projectPoints,
        reviewPoints,
        totalPoints,
        requiredPoints: DEFAULT_REQUIRED,
      },
      update: {
        publicationPoints: pubPoints,
        projectPoints,
        reviewPoints,
        totalPoints,
      },
    });

    return {
      ...record,
      details: {
        publications: pubDetails,
        projects: projectDetails,
        reviews: reviews.length,
        reviewPointsPerReview: REVIEW_POINTS,
      },
      completion: totalPoints >= (record.requiredPoints || DEFAULT_REQUIRED)
        ? 'ĐẠT' : `THIẾU ${((record.requiredPoints || DEFAULT_REQUIRED) - totalPoints).toFixed(1)} điểm`,
      percentage: Math.min(100, (totalPoints / (record.requiredPoints || DEFAULT_REQUIRED)) * 100),
    };
  }

  /**
   * Lấy bảng tổng hợp giờ chuẩn NCKH toàn trường
   */
  async getSummary(academicYear: string) {
    // PostgreSQL function
    const fast = await callDbFunction<Record<string, unknown>>(
      this.prisma,
      'fn_research_hours_summary',
      academicYear,
    );
    if (fast) return fast;

    // Fallback
    const records = await this.prisma.researchHours.findMany({
      where: { academicYear },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, role: true } },
      },
      orderBy: { totalPoints: 'desc' },
    });

    const total = records.length;
    const completed = records.filter(r => r.totalPoints >= r.requiredPoints).length;
    const avgPoints = total > 0 ? records.reduce((s, r) => s + r.totalPoints, 0) / total : 0;

    const byDept: Record<string, { count: number; completed: number; avgPoints: number }> = {};
    for (const r of records) {
      const dept = r.user.department || 'Khác';
      if (!byDept[dept]) byDept[dept] = { count: 0, completed: 0, avgPoints: 0 };
      byDept[dept].count++;
      if (r.totalPoints >= r.requiredPoints) byDept[dept].completed++;
      byDept[dept].avgPoints += r.totalPoints;
    }
    for (const dept of Object.keys(byDept)) {
      byDept[dept].avgPoints = byDept[dept].count > 0 ? byDept[dept].avgPoints / byDept[dept].count : 0;
    }

    return { academicYear, total, completed, avgPoints, byDepartment: byDept, records };
  }

  /**
   * Lấy giờ chuẩn của 1 user
   */
  async getMyHours(userId: number, academicYear: string) {
    const existing = await this.prisma.researchHours.findUnique({
      where: { userId_academicYear: { userId, academicYear } },
    });

    if (!existing) {
      // Auto-calculate
      return this.calculate(userId, academicYear);
    }

    return existing;
  }

  /**
   * Danh mục tạp chí
   */
  async getJournalRankings(search?: string, category?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { issn: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    return this.prisma.journalRanking.findMany({
      where,
      orderBy: [{ points: 'desc' }, { name: 'asc' }],
      take: 50,
    });
  }

  async createJournalRanking(data: {
    name: string; issn?: string; publisher?: string; category?: string;
    quartile?: string; impactFactor?: number; points: number; country?: string; url?: string;
  }) {
    return this.prisma.journalRanking.create({ data });
  }

  private getYearRange(academicYear: string): { gte: Date; lte: Date } {
    // "2024-2025" -> Sep 2024 to Aug 2025
    const [startYear] = academicYear.split('-').map(Number);
    return {
      gte: new Date(`${startYear}-09-01`),
      lte: new Date(`${startYear + 1}-08-31`),
    };
  }
}
