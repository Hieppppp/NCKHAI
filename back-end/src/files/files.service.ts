import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number; limit?: number; search?: string;
    category?: string; uploaderId?: number; workId?: number;
    mimeType?: string; hasOcr?: boolean;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { originalName: { contains: params.search, mode: 'insensitive' } },
        { extractedTitle: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.category) where.category = params.category;
    if (params.uploaderId) where.uploaderId = params.uploaderId;
    if (params.workId) where.workId = params.workId;
    if (params.mimeType) where.mimeType = { contains: params.mimeType };
    if (params.hasOcr !== undefined) {
      where.extractedText = params.hasOcr ? { not: null } : null;
    }

    const [data, total] = await Promise.all([
      this.prisma.fileUpload.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: { select: { id: true, name: true, email: true, department: true } },
          work: { select: { id: true, title: true, type: true } },
        },
      }),
      this.prisma.fileUpload.count({ where }),
    ]);

    return {
      data: data.map(f => ({
        id: f.id,
        filename: f.filename,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        sizeHuman: this.humanSize(f.size),
        path: f.path,
        category: f.category,
        hasOcr: !!f.extractedText,
        ocrConfidence: f.ocrConfidence,
        extractedTitle: f.extractedTitle,
        extractedAuthors: f.extractedAuthors,
        extractedKeywords: f.extractedKeywords,
        createdAt: f.createdAt,
        uploader: f.uploader,
        work: f.work,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [total, totalSize, byCategory, byMime, recent] = await Promise.all([
      this.prisma.fileUpload.count(),
      this.prisma.fileUpload.aggregate({ _sum: { size: true } }),
      this.prisma.fileUpload.groupBy({ by: ['category'], _count: true }),
      this.prisma.fileUpload.groupBy({ by: ['mimeType'], _count: true }),
      this.prisma.fileUpload.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
    ]);

    return {
      total,
      totalSize: totalSize._sum.size || 0,
      totalSizeHuman: this.humanSize(totalSize._sum.size || 0),
      recentWeek: recent,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
      byMime: byMime.map(m => ({
        mimeType: m.mimeType,
        count: m._count,
        label: this.mimeLabel(m.mimeType),
      })),
    };
  }

  async findOne(id: number) {
    const file = await this.prisma.fileUpload.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, email: true, department: true } },
        work: { select: { id: true, title: true, type: true, level: true } },
      },
    });
    if (!file) throw new NotFoundException(`File #${id} không tồn tại`);
    return { ...file, sizeHuman: this.humanSize(file.size) };
  }

  async getDownloadUrl(id: number) {
    const file = await this.findOne(id);
    const objectName = file.path.replace('minio://', '');
    const response = await fetch(`${AI_SERVICE_URL}/files/${objectName}/url`);
    if (!response.ok) throw new NotFoundException('Không thể lấy URL file');
    const data: any = await response.json();
    return { url: data.url, originalName: file.originalName, mimeType: file.mimeType };
  }

  async remove(id: number, userId: number, role: Role) {
    const file = await this.prisma.fileUpload.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`File #${id} không tồn tại`);
    if (file.uploaderId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }
    try {
      const objectName = file.path.replace('minio://', '');
      await fetch(`${AI_SERVICE_URL}/files/${objectName}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    await this.prisma.fileUpload.delete({ where: { id } });
    return { message: 'Đã xóa file' };
  }

  private humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  private mimeLabel(mime: string): string {
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('docx')) return 'Word';
    if (mime.includes('excel') || mime.includes('sheet')) return 'Excel';
    if (mime.includes('image')) return 'Hình ảnh';
    if (mime.includes('text')) return 'Văn bản';
    if (mime.includes('zip') || mime.includes('rar')) return 'Nén';
    return mime.split('/')[1]?.toUpperCase() || mime;
  }
}
