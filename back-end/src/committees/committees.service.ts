import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCommitteeDto, SubmitReviewDto } from './dto/create-committee.dto.js';

@Injectable()
export class CommitteesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommitteeDto) {
    const committee = await this.prisma.committee.create({
      data: {
        name: dto.name,
        description: dto.description,
        workId: dto.workId,
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : null,
        location: dto.location,
        members: {
          create: dto.members.map((m) => ({
            userId: m.userId,
            role: m.role,
          })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        work: { select: { id: true, title: true } },
      },
    });

    // Notify all members
    await this.prisma.notification.createMany({
      data: dto.members.map((m) => ({
        userId: m.userId,
        title: 'Bổ nhiệm vào hội đồng',
        message: `Bạn được bổ nhiệm vào hội đồng "${dto.name}" với vai trò ${m.role}`,
        type: 'COMMITTEE',
        link: `/committees/${committee.id}`,
        workId: dto.workId,
      })),
    });

    return committee;
  }

  async findAll(workId?: number) {
    const where = workId ? { workId } : {};
    return this.prisma.committee.findMany({
      where,
      include: {
        work: { select: { id: true, title: true, status: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const c = await this.prisma.committee.findUnique({
      where: { id },
      include: {
        work: { select: { id: true, title: true, authors: true, abstract: true, status: true, level: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, specialization: true } } } },
        reviews: {
          include: { reviewer: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!c) throw new NotFoundException(`Hội đồng #${id} không tồn tại`);
    return c;
  }

  async submitReview(dto: SubmitReviewDto, reviewerId: number) {
    const total = (dto.innovationScore || 0) + (dto.feasibilityScore || 0) + (dto.impactScore || 0);

    const review = await this.prisma.review.create({
      data: {
        workId: dto.workId,
        reviewerId,
        committeeId: dto.committeeId,
        innovationScore: dto.innovationScore,
        feasibilityScore: dto.feasibilityScore,
        impactScore: dto.impactScore,
        totalScore: total,
        comment: dto.comment,
        recommendation: dto.recommendation,
      },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    // Update committee final score if all members reviewed
    if (dto.committeeId) {
      const committee = await this.prisma.committee.findUnique({
        where: { id: dto.committeeId },
        include: { members: true, reviews: true },
      });

      if (committee && committee.reviews.length >= committee.members.length) {
        const avg = committee.reviews.reduce((s, r) => s + (r.totalScore || 0), 0) / committee.reviews.length;
        const conclusion = avg >= 70 ? 'Đạt' : avg >= 50 ? 'Cần chỉnh sửa' : 'Không đạt';

        await this.prisma.committee.update({
          where: { id: dto.committeeId },
          data: { finalScore: Math.round(avg * 100) / 100, conclusion },
        });
      }
    }

    // Notify work owner
    const work = await this.prisma.scientificWork.findUnique({ where: { id: dto.workId }, select: { userId: true, title: true } });
    if (work?.userId) {
      await this.prisma.notification.create({
        data: {
          userId: work.userId,
          title: 'Nhận xét mới',
          message: `Công trình "${work.title}" vừa nhận được đánh giá: ${total}/100`,
          type: 'COMMITTEE',
          link: `/projects/${dto.workId}`,
          workId: dto.workId,
        },
      });
    }

    return review;
  }
}
