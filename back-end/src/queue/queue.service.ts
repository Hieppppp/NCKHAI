import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.OCR) private ocrQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AI_SUMMARIZE) private summarizeQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /** Thêm job OCR - xử lý nặng async */
  async queueOcr(data: {
    objectName: string; originalName: string; mimeType: string;
    userId: number; workId?: number; publicationId?: number; libraryId?: number;
  }) {
    const job = await this.ocrQueue.add('process-ocr', data, { priority: 1 });
    await this.prisma.jobRecord.create({
      data: {
        jobId: job.id!,
        queueName: QUEUE_NAMES.OCR,
        status: 'pending',
        input: data,
        userId: data.userId,
        workId: data.workId,
      },
    });
    return { jobId: job.id, status: 'queued', queueName: QUEUE_NAMES.OCR };
  }

  /** Thêm job tóm tắt AI */
  async queueSummarize(data: { text: string; maxWords: number; userId: number; fileId?: number }) {
    const job = await this.summarizeQueue.add('summarize', data);
    await this.prisma.jobRecord.create({
      data: {
        jobId: job.id!,
        queueName: QUEUE_NAMES.AI_SUMMARIZE,
        status: 'pending',
        input: { textLength: data.text.length, maxWords: data.maxWords },
        userId: data.userId,
        fileId: data.fileId,
      },
    });
    return { jobId: job.id, status: 'queued' };
  }

  /** Get job status từ DB */
  async getJobStatus(jobId: string) {
    const record = await this.prisma.jobRecord.findUnique({ where: { jobId } });
    if (!record) return null;
    return record;
  }

  /** Legacy: List jobs của user (giữ tương thích ngược) */
  async getUserJobs(userId: number, limit = 20) {
    return this.prisma.jobRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** List jobs với filter + pagination */
  async listJobs(params: {
    userId?: number; page?: number; limit?: number;
    status?: string; queueName?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.status) where.status = params.status;
    if (params.queueName) where.queueName = params.queueName;

    const [data, total] = await Promise.all([
      this.prisma.jobRecord.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobRecord.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Queue statistics */
  async getStats() {
    const [ocr, summarize, dbStats] = await Promise.all([
      this.ocrQueue.getJobCounts(),
      this.summarizeQueue.getJobCounts(),
      this.prisma.jobRecord.groupBy({ by: ['status'], _count: true }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of dbStats) byStatus[s.status] = s._count;

    return {
      queues: {
        [QUEUE_NAMES.OCR]: ocr,
        [QUEUE_NAMES.AI_SUMMARIZE]: summarize,
      },
      byStatus,
      totalRecords: Object.values(byStatus).reduce((a, b) => a + b, 0),
    };
  }

  /** Retry a failed job - re-queue nó */
  async retryJob(jobId: string) {
    const record = await this.prisma.jobRecord.findUnique({ where: { jobId } });
    if (!record) throw new NotFoundException(`Job ${jobId} không tồn tại`);
    if (record.status !== 'failed') {
      return { message: 'Chỉ có thể retry job đã failed', status: record.status };
    }

    const queue = record.queueName === QUEUE_NAMES.OCR ? this.ocrQueue : this.summarizeQueue;
    const bullJob = await queue.getJob(jobId);
    if (bullJob) {
      await bullJob.retry();
    } else if (record.input) {
      // Job đã bị dọn khỏi BullMQ, tạo job mới với cùng input
      const newJob = await queue.add('retry', record.input as any);
      await this.prisma.jobRecord.update({
        where: { jobId },
        data: { status: 'pending', error: null, progress: 0 },
      });
      return { message: 'Đã tạo lại job', newJobId: newJob.id };
    }

    await this.prisma.jobRecord.update({
      where: { jobId },
      data: { status: 'pending', error: null, progress: 0 },
    });
    return { message: 'Đã retry job', jobId };
  }

  /** Xóa job record */
  async removeJob(jobId: string) {
    const record = await this.prisma.jobRecord.findUnique({ where: { jobId } });
    if (!record) throw new NotFoundException(`Job ${jobId} không tồn tại`);

    try {
      const queue = record.queueName === QUEUE_NAMES.OCR ? this.ocrQueue : this.summarizeQueue;
      const bullJob = await queue.getJob(jobId);
      if (bullJob) await bullJob.remove();
    } catch { /* ignore */ }

    await this.prisma.jobRecord.delete({ where: { jobId } });
    return { message: 'Đã xóa job' };
  }

  /** Dọn các job cũ đã completed/failed */
  async cleanOldJobs(olderThanHours: number) {
    const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000);
    const result = await this.prisma.jobRecord.deleteMany({
      where: {
        status: { in: ['completed', 'failed'] },
        completedAt: { lt: cutoff },
      },
    });
    return { message: `Đã dọn ${result.count} jobs`, count: result.count };
  }
}
