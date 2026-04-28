import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

interface SummarizeJobData {
  text: string;
  maxWords: number;
  userId: number;
  fileId?: number;
}

@Processor(QUEUE_NAMES.AI_SUMMARIZE, { concurrency: 2 })
export class SummarizeProcessor extends WorkerHost {
  private readonly logger = new Logger(SummarizeProcessor.name);

  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<SummarizeJobData>): Promise<any> {
    const { text, maxWords, fileId } = job.data;
    const jId = `${QUEUE_NAMES.AI_SUMMARIZE}_${job.id!}`;
    this.logger.log(`[Summarize] Job ${jId} - ${text.length} chars, max ${maxWords} từ`);

    await this.update(jId, 'processing', 10);

    try {
      await job.updateProgress(30);
      await this.update(jId, 'processing', 30);

      const response = await fetch(`${AI_SERVICE_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, max_words: maxWords }),
      });

      await job.updateProgress(80);
      await this.update(jId, 'processing', 80);

      if (!response.ok) throw new Error(`AI service trả ${response.status}`);
      const result: any = await response.json();

      // Lưu summary vào FileUpload nếu có fileId
      if (fileId && result.summary) {
        await this.prisma.fileUpload.update({
          where: { id: fileId },
          data: { extractedAbstract: result.summary.substring(0, 2000) },
        }).catch(() => {});
      }

      await this.update(jId, 'completed', 100, result);
      this.logger.log(`[Summarize] Job ${job.id} xong - ${result.summary?.length || 0} chars`);
      return { summary: result.summary, wordCount: result.word_count };
    } catch (error: any) {
      this.logger.error(`[Summarize] Fail ${job.id}: ${error.message}`);
      await this.update(jId, 'failed', job.progress as number, null, error.message);
      throw error;
    }
  }

  private async update(jobId: string, status: string, progress: number, result?: any, error?: string) {
    await this.prisma.jobRecord.upsert({
      where: { jobId },
      create: {
        jobId, queueName: QUEUE_NAMES.AI_SUMMARIZE, status, progress,
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
