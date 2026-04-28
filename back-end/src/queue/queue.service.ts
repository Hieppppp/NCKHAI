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
    @InjectQueue(QUEUE_NAMES.AI_EMBEDDING) private embeddingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT) private reportQueue: Queue,
    private prisma: PrismaService,
  ) {}

  private allQueues(): Record<string, Queue> {
    return {
      [QUEUE_NAMES.OCR]: this.ocrQueue,
      [QUEUE_NAMES.AI_SUMMARIZE]: this.summarizeQueue,
      [QUEUE_NAMES.AI_EMBEDDING]: this.embeddingQueue,
      [QUEUE_NAMES.EMAIL]: this.emailQueue,
      [QUEUE_NAMES.REPORT]: this.reportQueue,
    };
  }

  /** Tạo composite jobId để tránh trùng giữa các queue (BullMQ id reset từng queue) */
  private composeId(queueName: string, bullId: string): string {
    // Dùng "_" thay vì ":" để URL-friendly cho route Nest /jobs/:id
    return `${queueName}_${bullId}`;
  }

  /** Tách bullId ra từ composite jobId */
  private extractBullId(jobId: string): string {
    if (jobId.includes('_')) return jobId.split('_').pop()!;
    if (jobId.includes(':')) return jobId.split(':').pop()!;
    return jobId;
  }

  /** Thêm job OCR - xử lý nặng async */
  async queueOcr(data: {
    objectName: string; originalName: string; mimeType: string;
    userId: number; workId?: number; publicationId?: number; libraryId?: number;
  }) {
    const job = await this.ocrQueue.add('process-ocr', data, { priority: 1 });
    const jobId = this.composeId(QUEUE_NAMES.OCR, job.id!);
    await this.prisma.jobRecord.create({
      data: {
        jobId,
        queueName: QUEUE_NAMES.OCR,
        status: 'pending',
        input: data,
        userId: data.userId,
        workId: data.workId,
      },
    });
    return { jobId, status: 'queued', queueName: QUEUE_NAMES.OCR };
  }

  /** Thêm job tóm tắt AI */
  async queueSummarize(data: { text: string; maxWords: number; userId: number; fileId?: number }) {
    const job = await this.summarizeQueue.add('summarize', data);
    const jobId = this.composeId(QUEUE_NAMES.AI_SUMMARIZE, job.id!);
    await this.prisma.jobRecord.create({
      data: {
        jobId,
        queueName: QUEUE_NAMES.AI_SUMMARIZE,
        status: 'pending',
        input: { textLength: data.text.length, maxWords: data.maxWords },
        userId: data.userId,
        fileId: data.fileId,
      },
    });
    return { jobId, status: 'queued', queueName: QUEUE_NAMES.AI_SUMMARIZE };
  }

  /** Thêm job vector hóa (embedding) */
  async queueEmbedding(data: { text: string; userId: number; workId?: number; fileId?: number }) {
    const job = await this.embeddingQueue.add('embed', data);
    const jobId = this.composeId(QUEUE_NAMES.AI_EMBEDDING, job.id!);
    await this.prisma.jobRecord.create({
      data: {
        jobId,
        queueName: QUEUE_NAMES.AI_EMBEDDING,
        status: 'pending',
        input: { textLength: data.text.length, workId: data.workId, fileId: data.fileId },
        userId: data.userId,
        workId: data.workId,
        fileId: data.fileId,
      },
    });
    return { jobId, status: 'queued', queueName: QUEUE_NAMES.AI_EMBEDDING };
  }

  /** Thêm job gửi email */
  async queueEmail(data: { to: string; subject: string; body: string; template?: string; userId?: number }) {
    const job = await this.emailQueue.add('send-email', data);
    const jobId = this.composeId(QUEUE_NAMES.EMAIL, job.id!);
    await this.prisma.jobRecord.create({
      data: {
        jobId,
        queueName: QUEUE_NAMES.EMAIL,
        status: 'pending',
        input: { to: data.to, subject: data.subject, template: data.template },
        userId: data.userId,
      },
    });
    return { jobId, status: 'queued', queueName: QUEUE_NAMES.EMAIL };
  }

  /** Thêm job tạo báo cáo */
  async queueReport(data: { type: 'works' | 'finance' | 'research-hours' | 'committee'; params?: any; userId: number }) {
    const job = await this.reportQueue.add('generate-report', data);
    const jobId = this.composeId(QUEUE_NAMES.REPORT, job.id!);
    await this.prisma.jobRecord.create({
      data: {
        jobId,
        queueName: QUEUE_NAMES.REPORT,
        status: 'pending',
        input: { type: data.type, params: data.params },
        userId: data.userId,
      },
    });
    return { jobId, status: 'queued', queueName: QUEUE_NAMES.REPORT };
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

  /** Queue statistics - tất cả 5 queue */
  async getStats() {
    const queueMap = this.allQueues();
    const queueNames = Object.keys(queueMap);
    const counts = await Promise.all(queueNames.map(n => queueMap[n].getJobCounts()));
    const dbStats = await this.prisma.jobRecord.groupBy({ by: ['status'], _count: true });

    const queues: Record<string, any> = {};
    queueNames.forEach((n, i) => { queues[n] = counts[i]; });

    const byStatus: Record<string, number> = {};
    for (const s of dbStats) byStatus[s.status] = s._count;

    return {
      queues,
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

    const queue = this.allQueues()[record.queueName];
    if (!queue) throw new NotFoundException(`Không tìm thấy queue ${record.queueName}`);
    // jobId có dạng "queue-name:bullId" — tách bullId ra để gọi BullMQ
    const bullId = this.extractBullId(jobId);
    const bullJob = await queue.getJob(bullId);
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
      const queue = this.allQueues()[record.queueName];
      if (queue) {
        const bullId = this.extractBullId(jobId);
        const bullJob = await queue.getJob(bullId);
        if (bullJob) await bullJob.remove();
      }
    } catch { /* ignore */ }

    await this.prisma.jobRecord.delete({ where: { jobId } });
    return { message: 'Đã xóa job' };
  }

  /** Seeder: tạo job thử cho từng queue */
  async seedTestJobs(type: 'ocr' | 'summarize' | 'embedding' | 'email' | 'report' | 'all', userId: number) {
    const SAMPLE_TEXT = `Nghiên cứu về ứng dụng trí tuệ nhân tạo trong giáo dục đại học. Bài báo trình bày các phương pháp deep learning, convolutional neural network (CNN), transformer architecture được sử dụng để cá nhân hóa quá trình học tập, đánh giá tự động, và phát hiện gian lận trong thi cử. Kết quả thực nghiệm trên 1000 sinh viên cho thấy độ chính xác đạt 92.5% với mô hình BERT fine-tuned, giảm 40% thời gian chấm bài và tăng 25% mức độ hài lòng của sinh viên. Hệ thống đã được triển khai tại Đại học Bách Khoa Hà Nội với hơn 5000 lượt sử dụng/tháng.`.repeat(2);

    const jobs: any[] = [];

    if (type === 'summarize' || type === 'all') {
      const j = await this.queueSummarize({ text: SAMPLE_TEXT, maxWords: 100, userId });
      jobs.push({ type: 'summarize', ...j });
    }
    if (type === 'embedding' || type === 'all') {
      const j = await this.queueEmbedding({ text: SAMPLE_TEXT, userId });
      jobs.push({ type: 'embedding', ...j });
    }
    if (type === 'email' || type === 'all') {
      const j = await this.queueEmail({
        to: 'test-recipient@nckhai.vn',
        subject: 'Thông báo công trình NCKH mới được đăng ký',
        body: 'Hệ thống NCKH AI vừa nhận được đăng ký công trình mới từ tài khoản của bạn. Vui lòng đăng nhập để xem chi tiết.',
        template: 'work-registration',
        userId,
      });
      jobs.push({ type: 'email', ...j });
    }
    if (type === 'report' || type === 'all') {
      const j = await this.queueReport({ type: 'works', userId });
      jobs.push({ type: 'report-works', ...j });
    }

    return {
      message: `Đã đẩy ${jobs.length} test jobs vào queue`,
      jobs,
      hint: 'Theo dõi tại GET /api/jobs hoặc trang /jobs',
    };
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
