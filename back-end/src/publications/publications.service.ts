import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePublicationDto, UpdatePublicationDto } from './dto/create-publication.dto.js';
import { PublicationStatus } from '@prisma/client';

@Injectable()
export class PublicationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePublicationDto, userId: number) {
    const pub = await this.prisma.publication.create({
      data: {
        title: dto.title,
        authors: dto.authors,
        abstract: dto.abstract,
        journalName: dto.journalName,
        conferenceName: dto.conferenceName,
        publishedDate: dto.publishedDate ? new Date(dto.publishedDate) : undefined,
        doi: dto.doi,
        issn: dto.issn,
        keywords: dto.keywords || [],
        confidence: dto.confidence,
        fileId: dto.fileId,
        workId: dto.workId,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        file: { select: { id: true, originalName: true, path: true } },
      },
    });

    return pub;
  }

  async confirm(id: number, userId: number) {
    const pub = await this.prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new NotFoundException(`Publication #${id} không tồn tại`);

    const updated = await this.prisma.publication.update({
      where: { id },
      data: { status: PublicationStatus.CONFIRMED },
      include: {
        user: { select: { id: true, name: true, email: true } },
        file: true,
      },
    });

    // Auto-add to library - detect type from journal/conference
    const docType = updated.conferenceName ? 'CONFERENCE_PAPER' : 'JOURNAL_ARTICLE';

    await this.prisma.libraryDocument.create({
      data: {
        title: updated.title,
        authors: updated.authors,
        abstract: updated.abstract,
        keywords: updated.keywords,
        tags: updated.keywords,
        type: docType,
        aiScore: updated.confidence || undefined,
        publicationId: updated.id,
        workId: updated.workId,
        userId,
      },
    });

    return updated;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string; userId?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { authors: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    const [data, total] = await Promise.all([
      this.prisma.publication.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          file: { select: { id: true, originalName: true, path: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.publication.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const pub = await this.prisma.publication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        file: true,
        work: { select: { id: true, title: true } },
      },
    });
    if (!pub) throw new NotFoundException(`Publication #${id} không tồn tại`);
    return pub;
  }

  async update(id: number, dto: UpdatePublicationDto) {
    const pub = await this.prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new NotFoundException(`Publication #${id} không tồn tại`);

    return this.prisma.publication.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.authors && { authors: dto.authors }),
        ...(dto.abstract !== undefined && { abstract: dto.abstract }),
        ...(dto.journalName !== undefined && { journalName: dto.journalName }),
        ...(dto.conferenceName !== undefined && { conferenceName: dto.conferenceName }),
        ...(dto.publishedDate && { publishedDate: new Date(dto.publishedDate) }),
        ...(dto.doi !== undefined && { doi: dto.doi }),
        ...(dto.issn !== undefined && { issn: dto.issn }),
        ...(dto.keywords && { keywords: dto.keywords }),
        ...(dto.status && { status: dto.status as PublicationStatus }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        file: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.publication.delete({ where: { id } });
    return { message: `Đã xóa publication #${id}` };
  }
}
