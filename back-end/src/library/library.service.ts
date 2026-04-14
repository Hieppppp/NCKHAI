import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLibraryDocumentDto, UpdateLibraryDocumentDto } from './dto/library.dto.js';
import { WorkType, WorkLevel } from '@prisma/client';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLibraryDocumentDto, userId: number) {
    return this.prisma.libraryDocument.create({
      data: {
        title: dto.title,
        authors: dto.authors,
        abstract: dto.abstract,
        keywords: dto.keywords || [],
        tags: dto.tags || [],
        category: dto.category,
        type: dto.type as WorkType,
        level: dto.level as WorkLevel,
        aiScore: dto.aiScore,
        publicationId: dto.publicationId,
        workId: dto.workId,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        publication: { select: { id: true, journalName: true, doi: true } },
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    level?: string;
    category?: string;
    tag?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { authors: { contains: query.search, mode: 'insensitive' } },
        { keywords: { hasSome: [query.search] } },
        { tags: { hasSome: [query.search] } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.level) where.level = query.level;
    if (query.category) where.category = query.category;
    if (query.tag) where.tags = { hasSome: [query.tag] };

    const [data, total] = await Promise.all([
      this.prisma.libraryDocument.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          publication: { select: { id: true, journalName: true, conferenceName: true, doi: true, publishedDate: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.libraryDocument.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const doc = await this.prisma.libraryDocument.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        publication: true,
        work: { select: { id: true, title: true, status: true } },
      },
    });
    if (!doc) throw new NotFoundException(`Tài liệu #${id} không tồn tại`);

    // Increment view count
    await this.prisma.libraryDocument.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return doc;
  }

  async getStats() {
    const [total, byType, byLevel, topTags] = await Promise.all([
      this.prisma.libraryDocument.count(),
      this.prisma.libraryDocument.groupBy({ by: ['type'], _count: true }),
      this.prisma.libraryDocument.groupBy({ by: ['level'], _count: true }),
      this.prisma.libraryDocument.findMany({
        select: { tags: true },
        take: 200,
      }),
    ]);

    // Aggregate tags
    const tagMap: Record<string, number> = {};
    topTags.forEach((doc) => doc.tags.forEach((t) => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const tags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    return { total, byType, byLevel, topTags: tags };
  }

  async update(id: number, dto: UpdateLibraryDocumentDto) {
    const doc = await this.prisma.libraryDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Tài liệu #${id} không tồn tại`);

    return this.prisma.libraryDocument.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.authors && { authors: dto.authors }),
        ...(dto.abstract !== undefined && { abstract: dto.abstract }),
        ...(dto.keywords && { keywords: dto.keywords }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.aiScore !== undefined && { aiScore: dto.aiScore }),
      },
    });
  }

  async remove(id: number) {
    await this.prisma.libraryDocument.delete({ where: { id } });
    return { message: `Đã xóa tài liệu #${id}` };
  }
}
