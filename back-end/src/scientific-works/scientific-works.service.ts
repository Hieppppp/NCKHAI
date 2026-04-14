import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkDto } from './dto/create-work.dto.js';
import { UpdateWorkDto } from './dto/update-work.dto.js';
import { Role, WorkStatus, WorkLevel, WorkType } from '@prisma/client';

const WORKFLOW_TEMPLATES: Record<string, { name: string; status: WorkStatus }[]> = {
  UNIVERSITY: [
    { name: 'Đăng ký ý tưởng', status: WorkStatus.DRAFT },
    { name: 'Xét duyệt đề cương', status: WorkStatus.OUTLINE_REVIEW },
    { name: 'Thực hiện nghiên cứu', status: WorkStatus.IN_PROGRESS },
    { name: 'Nghiệm thu', status: WorkStatus.REVIEW },
    { name: 'Lưu trữ', status: WorkStatus.ARCHIVED },
  ],
  MINISTRY: [
    { name: 'Đăng ký ý tưởng', status: WorkStatus.DRAFT },
    { name: 'Xét duyệt đề cương', status: WorkStatus.OUTLINE_REVIEW },
    { name: 'Xét duyệt thuyết minh', status: WorkStatus.PROPOSAL_REVIEW },
    { name: 'Thực hiện nghiên cứu', status: WorkStatus.IN_PROGRESS },
    { name: 'Phản biện', status: WorkStatus.REVIEW },
    { name: 'Chỉnh sửa', status: WorkStatus.REVISION },
    { name: 'Nghiệm thu', status: WorkStatus.ACCEPTED },
    { name: 'Lưu trữ', status: WorkStatus.ARCHIVED },
  ],
  STATE: [
    { name: 'Đăng ký ý tưởng', status: WorkStatus.DRAFT },
    { name: 'Xét duyệt đề cương', status: WorkStatus.OUTLINE_REVIEW },
    { name: 'Xét duyệt thuyết minh', status: WorkStatus.PROPOSAL_REVIEW },
    { name: 'Thực hiện nghiên cứu', status: WorkStatus.IN_PROGRESS },
    { name: 'Phản biện lần 1', status: WorkStatus.REVIEW },
    { name: 'Chỉnh sửa', status: WorkStatus.REVISION },
    { name: 'Phản biện lần 2', status: WorkStatus.REVIEW },
    { name: 'Nghiệm thu cấp nhà nước', status: WorkStatus.ACCEPTED },
    { name: 'Lưu trữ', status: WorkStatus.ARCHIVED },
  ],
};

@Injectable()
export class ScientificWorksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkDto, userId: number) {
    const level = (dto.level as WorkLevel) || WorkLevel.UNIVERSITY;
    const type = (dto.type as WorkType) || WorkType.RESEARCH_PROJECT;

    const work = await this.prisma.scientificWork.create({
      data: {
        title: dto.title,
        authors: dto.authors,
        abstract: dto.abstract,
        content: dto.content,
        keywords: dto.keywords || [],
        type,
        level,
        budget: dto.budget,
        journalName: dto.journalName,
        issn: dto.issn,
        doi: dto.doi,
        userId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Auto-generate workflow steps
    const template = WORKFLOW_TEMPLATES[level] || WORKFLOW_TEMPLATES.UNIVERSITY;
    await this.prisma.workflowStep.createMany({
      data: template.map((step, idx) => ({
        workId: work.id,
        name: step.name,
        order: idx + 1,
        status: idx === 0 ? WorkStatus.DRAFT : WorkStatus.DRAFT,
      })),
    });

    // Notify admins
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: 'Đề tài mới đăng ký',
          message: `"${work.title}" vừa được đăng ký bởi ${work.authors}`,
          type: 'WORKFLOW',
          link: `/projects/${work.id}`,
          workId: work.id,
        })),
      });
    }

    return work;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string; type?: string; level?: string; userId?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { authors: { contains: query.search, mode: 'insensitive' } },
        { keywords: { hasSome: [query.search] } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.level) where.level = query.level;
    if (query.userId) where.userId = query.userId;

    const [data, total] = await Promise.all([
      this.prisma.scientificWork.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, department: true } },
          _count: { select: { files: true, reviews: true, committees: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scientificWork.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const work = await this.prisma.scientificWork.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, specialization: true } },
        files: { orderBy: { createdAt: 'desc' } },
        workflowSteps: { orderBy: { order: 'asc' } },
        committees: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
        reviews: {
          include: { reviewer: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!work) throw new NotFoundException(`Công trình #${id} không tồn tại`);
    return work;
  }

  async update(id: number, dto: UpdateWorkDto, userId: number, userRole: Role) {
    const work = await this.prisma.scientificWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException(`Công trình #${id} không tồn tại`);

    if (userRole !== Role.ADMIN && work.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa công trình này');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.authors !== undefined) data.authors = dto.authors;
    if (dto.abstract !== undefined) data.abstract = dto.abstract;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.keywords !== undefined) data.keywords = dto.keywords;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (dto.journalName !== undefined) data.journalName = dto.journalName;
    if (dto.issn !== undefined) data.issn = dto.issn;
    if (dto.doi !== undefined) data.doi = dto.doi;

    // Status transition
    if (dto.status !== undefined && dto.status !== work.status) {
      if (userRole !== Role.ADMIN && userRole !== Role.REVIEWER) {
        throw new ForbiddenException('Chỉ quản trị viên hoặc phản biện mới có thể đổi trạng thái');
      }
      data.status = dto.status;

      // Update workflow step
      await this.prisma.workflowStep.updateMany({
        where: { workId: id, status: work.status },
        data: { completedAt: new Date() },
      });

      // Notify owner
      if (work.userId) {
        await this.prisma.notification.create({
          data: {
            userId: work.userId,
            title: 'Cập nhật trạng thái',
            message: `Công trình "${work.title}" chuyển sang: ${dto.status}`,
            type: 'WORKFLOW',
            link: `/projects/${id}`,
            workId: id,
          },
        });
      }
    }

    return this.prisma.scientificWork.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: number, userId: number, userRole: Role) {
    const work = await this.prisma.scientificWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException(`Công trình #${id} không tồn tại`);
    if (userRole !== Role.ADMIN && work.userId !== userId) {
      throw new ForbiddenException('Không có quyền xóa');
    }

    await this.prisma.scientificWork.delete({ where: { id } });
    return { message: `Đã xóa công trình #${id}` };
  }

  async getWorkflow(id: number) {
    const steps = await this.prisma.workflowStep.findMany({
      where: { workId: id },
      orderBy: { order: 'asc' },
    });
    if (steps.length === 0) throw new NotFoundException(`Không tìm thấy quy trình cho công trình #${id}`);
    return steps;
  }
}
