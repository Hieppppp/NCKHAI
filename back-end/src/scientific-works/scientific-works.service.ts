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

// Trạng thái coi như "đã duyệt" → mọi người đều xem được
const PUBLIC_STATUSES: WorkStatus[] = [WorkStatus.ACCEPTED, WorkStatus.ARCHIVED];

// Các loại công trình KH (loại trừ bằng sáng chế & giáo trình - có màn riêng)
const NON_SCIENTIFIC_TYPES: WorkType[] = [WorkType.PATENT, WorkType.TEXTBOOK];

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

  async findAll(query: {
    page?: number; limit?: number; search?: string; status?: string; type?: string;
    level?: string; category?: string; userId?: number;
    requesterId?: number; requesterRole?: Role;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    const and: Record<string, unknown>[] = [];

    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { authors: { contains: query.search, mode: 'insensitive' } },
          { keywords: { hasSome: [query.search] } },
        ],
      });
    }
    if (query.status) where.status = query.status;
    if (query.level) where.level = query.level;
    if (query.userId) where.userId = query.userId;

    // Màn Công trình KH loại trừ bằng sáng chế & giáo trình (đã có module/bảng riêng)
    if (query.category === 'scientific') where.type = { notIn: NON_SCIENTIFIC_TYPES };
    // type cụ thể (dropdown) ghi đè nhóm
    if (query.type) where.type = query.type;

    // Quyền xem: chỉ ADMIN/REVIEWER thấy mọi trạng thái.
    // LECTURER/STUDENT chỉ thấy công trình đã duyệt HOẶC do chính mình tạo.
    const isReviewerOrAdmin = query.requesterRole === Role.ADMIN || query.requesterRole === Role.REVIEWER;
    if (!isReviewerOrAdmin && query.requesterId) {
      and.push({
        OR: [
          { status: { in: PUBLIC_STATUSES } },
          { userId: query.requesterId },
        ],
      });
    }

    if (and.length) where.AND = and;

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

  async findOne(id: number, requesterId?: number, requesterRole?: Role) {
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

    // Quyền xem: chưa duyệt thì chỉ chủ sở hữu + ADMIN/REVIEWER được xem
    const isReviewerOrAdmin = requesterRole === Role.ADMIN || requesterRole === Role.REVIEWER;
    const isPublic = PUBLIC_STATUSES.includes(work.status);
    const isOwner = work.userId === requesterId;
    if (!isReviewerOrAdmin && !isPublic && !isOwner) {
      throw new ForbiddenException('Công trình này chưa được duyệt nên bạn không có quyền xem');
    }

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

  // ─── File Management (MinIO) ─────────────────────────────
  // Lưu file lên MinIO qua AI service, DB chỉ lưu path

  async uploadFile(
    workId: number,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number,
    userId: number,
    category?: string,
  ) {
    const work = await this.prisma.scientificWork.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException(`Công trình #${workId} không tồn tại`);

    // Upload to MinIO qua AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const boundary = '----WorkFile' + Date.now();
    const parts: Buffer[] = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${originalName}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(buffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const response = await fetch(`${AI_SERVICE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    if (!response.ok) throw new Error('Upload lên MinIO thất bại');
    const result: any = await response.json();

    // Chỉ lưu path + metadata vào DB
    const record = await this.prisma.fileUpload.create({
      data: {
        filename: result.file.objectName,
        originalName,
        mimeType,
        size,
        path: `minio://${result.file.objectName}`,
        category: (category as any) || 'MANUSCRIPT',
        uploaderId: userId,
        workId,
        extractedText: result.ocr?.text?.substring(0, 50000),
        extractedTitle: result.extraction?.title,
        extractedAuthors: result.extraction?.authors,
        extractedAbstract: result.extraction?.abstract,
        extractedKeywords: result.extraction?.keywords || [],
        ocrConfidence: result.ocr?.confidence,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });

    return record;
  }

  async getFiles(workId: number) {
    return this.prisma.fileUpload.findMany({
      where: { workId },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(fileId: number) {
    const file = await this.prisma.fileUpload.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException(`File #${fileId} không tồn tại`);

    const objectName = file.path.replace('minio://', '');
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const response = await fetch(`${AI_SERVICE_URL}/files/${objectName}/url`);
    if (!response.ok) throw new NotFoundException('Không thể lấy URL file');
    const data: any = await response.json();
    return { url: data.url, originalName: file.originalName, mimeType: file.mimeType };
  }

  async deleteFile(fileId: number, userId: number, role: Role) {
    const file = await this.prisma.fileUpload.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException(`File #${fileId} không tồn tại`);

    // Chỉ uploader hoặc admin được xóa
    if (file.uploaderId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    // Xóa khỏi MinIO
    try {
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
      const objectName = file.path.replace('minio://', '');
      await fetch(`${AI_SERVICE_URL}/files/${objectName}`, { method: 'DELETE' });
    } catch { /* ignore */ }

    await this.prisma.fileUpload.delete({ where: { id: fileId } });
    return { message: 'Đã xóa file' };
  }
}
