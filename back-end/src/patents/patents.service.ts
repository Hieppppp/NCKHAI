import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePatentDto, UpdatePatentDto } from './dto/patent.dto.js';
import { Role, PatentStatus, PatentType } from '@prisma/client';

// Trạng thái "đã duyệt" → mọi người đều xem được
const PUBLIC_STATUSES: PatentStatus[] = [PatentStatus.GRANTED];

@Injectable()
export class PatentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatentDto, userId: number) {
    return this.prisma.patent.create({
      data: {
        title: dto.title,
        inventors: dto.inventors,
        owner: dto.owner,
        abstract: dto.abstract,
        patentType: (dto.patentType as PatentType) || PatentType.INVENTION,
        applicationNo: dto.applicationNo,
        patentNo: dto.patentNo,
        issuingAuthority: dto.issuingAuthority,
        ipcClass: dto.ipcClass,
        field: dto.field,
        keywords: dto.keywords || [],
        filingDate: dto.filingDate ? new Date(dto.filingDate) : undefined,
        grantDate: dto.grantDate ? new Date(dto.grantDate) : undefined,
        userId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string; status?: string; patentType?: string;
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
          { inventors: { contains: query.search, mode: 'insensitive' } },
          { patentNo: { contains: query.search, mode: 'insensitive' } },
          { keywords: { hasSome: [query.search] } },
        ],
      });
    }
    if (query.status) where.status = query.status;
    if (query.patentType) where.patentType = query.patentType;

    // Quyền xem: ADMIN/REVIEWER thấy tất cả; còn lại chỉ thấy bằng đã cấp HOẶC do mình tạo
    const isReviewerOrAdmin = query.requesterRole === Role.ADMIN || query.requesterRole === Role.REVIEWER;
    if (!isReviewerOrAdmin && query.requesterId) {
      and.push({ OR: [{ status: { in: PUBLIC_STATUSES } }, { userId: query.requesterId }] });
    }
    if (and.length) where.AND = and;

    const [data, total] = await Promise.all([
      this.prisma.patent.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, department: true } } },
        skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patent.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, requesterId?: number, requesterRole?: Role) {
    const patent = await this.prisma.patent.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    });
    if (!patent) throw new NotFoundException(`Bằng sáng chế #${id} không tồn tại`);

    const isReviewerOrAdmin = requesterRole === Role.ADMIN || requesterRole === Role.REVIEWER;
    const isPublic = PUBLIC_STATUSES.includes(patent.status);
    if (!isReviewerOrAdmin && !isPublic && patent.userId !== requesterId) {
      throw new ForbiddenException('Bằng sáng chế này chưa được cấp nên bạn không có quyền xem');
    }
    return patent;
  }

  async update(id: number, dto: UpdatePatentDto, userId: number, role: Role) {
    const patent = await this.prisma.patent.findUnique({ where: { id } });
    if (!patent) throw new NotFoundException(`Bằng sáng chế #${id} không tồn tại`);
    if (role !== Role.ADMIN && patent.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bằng sáng chế này');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.inventors !== undefined) data.inventors = dto.inventors;
    if (dto.owner !== undefined) data.owner = dto.owner;
    if (dto.abstract !== undefined) data.abstract = dto.abstract;
    if (dto.patentType !== undefined) data.patentType = dto.patentType;
    if (dto.applicationNo !== undefined) data.applicationNo = dto.applicationNo;
    if (dto.patentNo !== undefined) data.patentNo = dto.patentNo;
    if (dto.issuingAuthority !== undefined) data.issuingAuthority = dto.issuingAuthority;
    if (dto.ipcClass !== undefined) data.ipcClass = dto.ipcClass;
    if (dto.field !== undefined) data.field = dto.field;
    if (dto.keywords !== undefined) data.keywords = dto.keywords;
    if (dto.filingDate !== undefined) data.filingDate = dto.filingDate ? new Date(dto.filingDate) : null;
    if (dto.grantDate !== undefined) data.grantDate = dto.grantDate ? new Date(dto.grantDate) : null;

    // Đổi trạng thái: chỉ ADMIN/REVIEWER
    if (dto.status !== undefined && dto.status !== patent.status) {
      if (role !== Role.ADMIN && role !== Role.REVIEWER) {
        throw new ForbiddenException('Chỉ quản trị viên hoặc phản biện mới có thể đổi trạng thái');
      }
      data.status = dto.status;
    }

    return this.prisma.patent.update({
      where: { id }, data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: number, userId: number, role: Role) {
    const patent = await this.prisma.patent.findUnique({ where: { id } });
    if (!patent) throw new NotFoundException(`Bằng sáng chế #${id} không tồn tại`);
    if (role !== Role.ADMIN && patent.userId !== userId) {
      throw new ForbiddenException('Không có quyền xóa');
    }
    await this.prisma.patent.delete({ where: { id } });
    return { message: `Đã xóa bằng sáng chế #${id}` };
  }
}
