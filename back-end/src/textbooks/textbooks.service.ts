import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTextbookDto, UpdateTextbookDto } from './dto/textbook.dto.js';
import { Role, TextbookStatus, TextbookType, WorkLevel } from '@prisma/client';

// Trạng thái "đã duyệt" → mọi người đều xem được
const PUBLIC_STATUSES: TextbookStatus[] = [TextbookStatus.APPROVED, TextbookStatus.PUBLISHED];

@Injectable()
export class TextbooksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTextbookDto, userId: number) {
    return this.prisma.textbook.create({
      data: {
        title: dto.title,
        authors: dto.authors,
        abstract: dto.abstract,
        materialType: (dto.materialType as TextbookType) || TextbookType.TEXTBOOK,
        publisher: dto.publisher,
        isbn: dto.isbn,
        publishYear: dto.publishYear,
        edition: dto.edition,
        pages: dto.pages,
        subject: dto.subject,
        field: dto.field,
        approvalLevel: (dto.approvalLevel as WorkLevel) || WorkLevel.UNIVERSITY,
        keywords: dto.keywords || [],
        userId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string; status?: string; materialType?: string;
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
          { subject: { contains: query.search, mode: 'insensitive' } },
          { keywords: { hasSome: [query.search] } },
        ],
      });
    }
    if (query.status) where.status = query.status;
    if (query.materialType) where.materialType = query.materialType;

    // Quyền xem: ADMIN/REVIEWER thấy tất cả; còn lại chỉ thấy giáo trình đã duyệt HOẶC do mình tạo
    const isReviewerOrAdmin = query.requesterRole === Role.ADMIN || query.requesterRole === Role.REVIEWER;
    if (!isReviewerOrAdmin && query.requesterId) {
      and.push({ OR: [{ status: { in: PUBLIC_STATUSES } }, { userId: query.requesterId }] });
    }
    if (and.length) where.AND = and;

    const [data, total] = await Promise.all([
      this.prisma.textbook.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, department: true } } },
        skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.textbook.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, requesterId?: number, requesterRole?: Role) {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    });
    if (!textbook) throw new NotFoundException(`Giáo trình #${id} không tồn tại`);

    const isReviewerOrAdmin = requesterRole === Role.ADMIN || requesterRole === Role.REVIEWER;
    const isPublic = PUBLIC_STATUSES.includes(textbook.status);
    if (!isReviewerOrAdmin && !isPublic && textbook.userId !== requesterId) {
      throw new ForbiddenException('Giáo trình này chưa được duyệt nên bạn không có quyền xem');
    }
    return textbook;
  }

  async update(id: number, dto: UpdateTextbookDto, userId: number, role: Role) {
    const textbook = await this.prisma.textbook.findUnique({ where: { id } });
    if (!textbook) throw new NotFoundException(`Giáo trình #${id} không tồn tại`);
    if (role !== Role.ADMIN && textbook.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa giáo trình này');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.authors !== undefined) data.authors = dto.authors;
    if (dto.abstract !== undefined) data.abstract = dto.abstract;
    if (dto.materialType !== undefined) data.materialType = dto.materialType;
    if (dto.publisher !== undefined) data.publisher = dto.publisher;
    if (dto.isbn !== undefined) data.isbn = dto.isbn;
    if (dto.publishYear !== undefined) data.publishYear = dto.publishYear;
    if (dto.edition !== undefined) data.edition = dto.edition;
    if (dto.pages !== undefined) data.pages = dto.pages;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.field !== undefined) data.field = dto.field;
    if (dto.approvalLevel !== undefined) data.approvalLevel = dto.approvalLevel;
    if (dto.keywords !== undefined) data.keywords = dto.keywords;

    // Đổi trạng thái: chỉ ADMIN/REVIEWER
    if (dto.status !== undefined && dto.status !== textbook.status) {
      if (role !== Role.ADMIN && role !== Role.REVIEWER) {
        throw new ForbiddenException('Chỉ quản trị viên hoặc phản biện mới có thể đổi trạng thái');
      }
      data.status = dto.status;
    }

    return this.prisma.textbook.update({
      where: { id }, data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: number, userId: number, role: Role) {
    const textbook = await this.prisma.textbook.findUnique({ where: { id } });
    if (!textbook) throw new NotFoundException(`Giáo trình #${id} không tồn tại`);
    if (role !== Role.ADMIN && textbook.userId !== userId) {
      throw new ForbiddenException('Không có quyền xóa');
    }
    await this.prisma.textbook.delete({ where: { id } });
    return { message: `Đã xóa giáo trình #${id}` };
  }
}
