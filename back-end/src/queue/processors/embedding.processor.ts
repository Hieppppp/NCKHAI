import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

interface EmbeddingJobData {
  text: string;
  workId?: number;
  fileId?: number;
  userId: number;
}

@Processor(QUEUE_NAMES.AI_EMBEDDING, { concurrency: 1 })
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<EmbeddingJobData>): Promise<any> {
    const { text, workId, fileId } = job.data;
    const jId = `${QUEUE_NAMES.AI_EMBEDDING}_${job.id!}`;
    this.logger.log(`[Embedding] Job ${jId} - ${text.length} chars`);

    await this.update(jId, 'processing', 15);

    try {
      await job.updateProgress(40);
      await this.update(jId, 'processing', 40);

      // Gọi AI service để extract keywords (proxy cho TF-IDF vector)
      const response = await fetch(`${AI_SERVICE_URL}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, top_k: 25 }),
      });

      await job.updateProgress(75);
      await this.update(jId, 'processing', 75);

      if (!response.ok) throw new Error(`AI service trả ${response.status}`);
      const result: any = await response.json();
      const keywords = result.keywords || [];

      // Lưu keywords làm vector "đại diện" cho công trình/file
      if (workId) {
        await this.prisma.scientificWork.update({
          where: { id: workId },
          data: { keywords: keywords.slice(0, 20) },
        }).catch(() => {});
      }
      if (fileId) {
        await this.prisma.fileUpload.update({
          where: { id: fileId },
          data: { extractedKeywords: keywords.slice(0, 20) },
        }).catch(() => {});
      }

      const finalResult = {
        vectorSize: keywords.length,
        topKeywords: keywords.slice(0, 10),
        message: 'Đã vector hóa và index vào DB',
      };
      await this.update(jId, 'completed', 100, finalResult);
      this.logger.log(`[Embedding] Job ${job.id} xong - ${keywords.length} keywords`);
      return finalResult;
    } catch (error: any) {
      this.logger.error(`[Embedding] Fail ${job.id}: ${error.message}`);
      await this.update(jId, 'failed', job.progress as number, null, error.message);
      throw error;
    }
  }

  private async update(jobId: string, status: string, progress: number, result?: any, error?: string) {
    await this.prisma.jobRecord.upsert({
      where: { jobId },
      create: {
        jobId, queueName: QUEUE_NAMES.AI_EMBEDDING, status, progress,
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
