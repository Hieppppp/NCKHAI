import { Injectable } from '@nestjs/common';
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
    const job = await this.ocrQueue.add('process-ocr', data, {
      priority: 1,
    });

    // Record vào DB
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

  /** List jobs của user */
  async getUserJobs(userId: number, limit = 20) {
    return this.prisma.jobRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Queue statistics */
  async getStats() {
    const [ocr, summarize] = await Promise.all([
      this.ocrQueue.getJobCounts(),
      this.summarizeQueue.getJobCounts(),
    ]);
    return {
      [QUEUE_NAMES.OCR]: ocr,
      [QUEUE_NAMES.AI_SUMMARIZE]: summarize,
    };
  }
}
