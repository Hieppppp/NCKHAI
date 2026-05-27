import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { callDbFunction } from '../prisma/db-functions.js';
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
        // Thư viện = thông tin khoa học mới; không bắt chọn loại bài báo nữa
        type: (dto.type as WorkType) || WorkType.RESEARCH_PROJECT,
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
          publication: {
            select: {
              id: true, journalName: true, conferenceName: true, doi: true, issn: true, publishedDate: true,
              file: { select: { id: true, originalName: true, path: true, mimeType: true, size: true } },
            },
          },
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
        publication: { include: { file: true } },
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
    // PostgreSQL function (1 query thay 4)
    const fast = await callDbFunction<Record<string, unknown>>(
      this.prisma,
      'fn_library_stats',
    );
    if (fast) return fast;

    // Fallback
    const [total, byType, byLevel, topTags] = await Promise.all([
      this.prisma.libraryDocument.count(),
      this.prisma.libraryDocument.groupBy({ by: ['type'], _count: true }),
      this.prisma.libraryDocument.groupBy({ by: ['level'], _count: true }),
      this.prisma.libraryDocument.findMany({
        select: { tags: true },
        take: 200,
      }),
    ]);

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

  /**
   * Upload file cho LibraryDocument:
   * - Upload lên MinIO qua AI service
   * - Tạo FileUpload record
   * - Tạo/update Publication liên kết với LibraryDocument
   */
  async uploadFile(
    libId: number,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number,
    userId: number,
  ) {
    const lib = await this.prisma.libraryDocument.findUnique({ where: { id: libId }, include: { publication: true } });
    if (!lib) throw new NotFoundException(`Tài liệu #${libId} không tồn tại`);

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const boundary = '----LibFile' + Date.now();
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

    // Create FileUpload record
    const fileRecord = await this.prisma.fileUpload.create({
      data: {
        filename: result.file.objectName,
        originalName,
        mimeType,
        size,
        path: `minio://${result.file.objectName}`,
        category: 'MANUSCRIPT',
        uploaderId: userId,
      },
    });

    // Link với Publication (tạo nếu chưa có)
    let pubId = lib.publicationId;
    if (!pubId) {
      const pub = await this.prisma.publication.create({
        data: {
          title: lib.title,
          authors: lib.authors,
          abstract: lib.abstract,
          keywords: lib.keywords,
          status: 'CONFIRMED',
          userId,
          fileId: fileRecord.id,
        },
      });
      pubId = pub.id;
      await this.prisma.libraryDocument.update({
        where: { id: libId },
        data: { publicationId: pubId },
      });
    } else {
      await this.prisma.publication.update({
        where: { id: pubId },
        data: { fileId: fileRecord.id },
      });
    }

    return {
      file: fileRecord,
      message: 'Upload thành công',
    };
  }

  /**
   * Lấy presigned URL download từ MinIO
   */
  async getDownloadUrl(libId: number) {
    const lib = await this.prisma.libraryDocument.findUnique({
      where: { id: libId },
      include: { publication: { include: { file: true } } },
    });
    if (!lib) throw new NotFoundException(`Tài liệu #${libId} không tồn tại`);
    const file = lib.publication?.file;
    if (!file) throw new NotFoundException('Tài liệu này chưa có file đính kèm');

    const objectName = file.path.replace('minio://', '');
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const response = await fetch(`${AI_SERVICE_URL}/files/${objectName}/url`);
    if (!response.ok) throw new NotFoundException('Không thể lấy URL file');
    const data: any = await response.json();

    // Tăng download count
    await this.prisma.libraryDocument.update({
      where: { id: libId },
      data: { downloadCount: { increment: 1 } },
    });

    return { url: data.url, originalName: file.originalName, mimeType: file.mimeType };
  }
}
