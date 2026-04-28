import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

interface ReportJobData {
  type: 'works' | 'finance' | 'research-hours' | 'committee';
  params?: any;
  userId: number;
}

@Processor(QUEUE_NAMES.REPORT, { concurrency: 1 })
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<ReportJobData>): Promise<any> {
    const { type } = job.data;
    const jId = `${QUEUE_NAMES.REPORT}_${job.id!}`;
    this.logger.log(`[Report] Job ${jId} - tạo báo cáo "${type}"`);

    await this.update(jId, 'processing', 10);

    try {
      // Bước 1: Truy vấn data
      await job.updateProgress(25);
      await this.update(jId, 'processing', 25);

      let data: any;
      switch (type) {
        case 'works': {
          const [total, byStatus, byLevel] = await Promise.all([
            this.prisma.scientificWork.count(),
            this.prisma.scientificWork.groupBy({ by: ['status'], _count: true }),
            this.prisma.scientificWork.groupBy({ by: ['level'], _count: true }),
          ]);
          data = { total, byStatus, byLevel };
          break;
        }
        case 'finance': {
          const works = await this.prisma.scientificWork.aggregate({
            _sum: { budget: true }, _count: true,
          });
          data = { totalBudget: works._sum.budget || 0, totalProjects: works._count };
          break;
        }
        case 'research-hours': {
          const total = await this.prisma.user.count();
          data = { totalLecturers: total, message: 'Báo cáo giờ chuẩn NCKH' };
          break;
        }
        case 'committee': {
          const total = await this.prisma.committee.count();
          data = { totalCommittees: total };
          break;
        }
        default: throw new Error(`Loại báo cáo không hợp lệ: ${type}`);
      }

      await job.updateProgress(60);
      await this.update(jId, 'processing', 60);

      // Bước 2: Render PDF (mô phỏng - thực tế dùng puppeteer/pdfkit)
      await new Promise(r => setTimeout(r, 1200));
      await job.updateProgress(90);
      await this.update(jId, 'processing', 90);

      const result = {
        reportType: type,
        generatedAt: new Date().toISOString(),
        data,
        fileSize: `${Math.floor(Math.random() * 500 + 100)} KB`,
        pages: Math.floor(Math.random() * 10 + 3),
        downloadUrl: `/api/reports/download/${job.id}`,
        message: `Đã tạo báo cáo ${type} thành công`,
      };

      await this.update(jId, 'completed', 100, result);
      this.logger.log(`[Report] Job ${job.id} xong - ${result.pages} pages`);
      return result;
    } catch (error: any) {
      this.logger.error(`[Report] Fail ${job.id}: ${error.message}`);
      await this.update(jId, 'failed', job.progress as number, null, error.message);
      throw error;
    }
  }

  private async update(jobId: string, status: string, progress: number, result?: any, error?: string) {
    await this.prisma.jobRecord.upsert({
      where: { jobId },
      create: {
        jobId, queueName: QUEUE_NAMES.REPORT, status, progress,
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
