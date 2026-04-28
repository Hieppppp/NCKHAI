import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
  userId?: number;
}

@Processor(QUEUE_NAMES.EMAIL, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<EmailJobData>): Promise<any> {
    const { to, subject } = job.data;
    const jId = `${QUEUE_NAMES.EMAIL}_${job.id!}`;
    this.logger.log(`[Email] Job ${jId} - gửi tới ${to}: "${subject}"`);

    await this.update(jId, 'processing', 20);

    try {
      // Mô phỏng gửi email (chưa có SMTP thật)
      // Thực tế: dùng nodemailer + SMTP config từ env
      await new Promise(r => setTimeout(r, 800));
      await job.updateProgress(60);
      await this.update(jId, 'processing', 60);

      // Validate email format đơn giản
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error(`Email không hợp lệ: ${to}`);
      }

      await new Promise(r => setTimeout(r, 400));

      const result = {
        sentTo: to,
        subject,
        sentAt: new Date().toISOString(),
        provider: 'mock-smtp',
        messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@nckhai.vn>`,
      };

      await this.update(jId, 'completed', 100, result);
      this.logger.log(`[Email] Job ${job.id} xong - ${result.messageId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[Email] Fail ${job.id}: ${error.message}`);
      await this.update(jId, 'failed', job.progress as number, null, error.message);
      throw error;
    }
  }

  private async update(jobId: string, status: string, progress: number, result?: any, error?: string) {
    await this.prisma.jobRecord.upsert({
      where: { jobId },
      create: {
        jobId, queueName: QUEUE_NAMES.EMAIL, status, progress,
        result: result || undefined, error,
        startedAt: status === 'processing' ? new Date() : undefined,
        completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
      },
      update: {
        status, progress, result: result || undefined, error,
        completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
      },
    }).catch(() => {});
  }
}
