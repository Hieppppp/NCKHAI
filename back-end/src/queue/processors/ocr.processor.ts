import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

interface OcrJobData {
  objectName: string;       // MinIO object name
  originalName: string;
  mimeType: string;
  userId: number;
  workId?: number;
  publicationId?: number;
  libraryId?: number;
}

@Processor(QUEUE_NAMES.OCR, { concurrency: 2 })
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<OcrJobData>): Promise<any> {
    const { objectName, originalName, workId } = job.data;
    this.logger.log(`[OCR] Processing job ${job.id} - ${originalName}`);

    const jobIdComposite = `${QUEUE_NAMES.OCR}_${job.id!}`;
    await this.updateJobRecord(jobIdComposite, 'processing', 0);

    try {
      // Download file from MinIO → pass to AI service /process
      await job.updateProgress(20);
      await this.updateJobRecord(jobIdComposite, 'processing', 20);

      const response = await fetch(`${AI_SERVICE_URL}/reprocess?object_name=${encodeURIComponent(objectName)}`, {
        method: 'POST',
      });

      await job.updateProgress(70);
      await this.updateJobRecord(jobIdComposite, 'processing', 70);

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result: any = await response.json();

      // Update FileUpload record với kết quả OCR - tìm theo objectName (filename)
      const files = await this.prisma.fileUpload.findMany({
        where: { filename: objectName },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (files[0]) {
        await this.prisma.fileUpload.update({
          where: { id: files[0].id },
          data: {
            extractedText: result.ocr?.text?.substring(0, 50000),
            extractedTitle: result.extraction?.title,
            extractedAuthors: result.extraction?.authors,
            extractedAbstract: result.extraction?.abstract,
            extractedKeywords: result.extraction?.keywords || [],
            ocrConfidence: result.ocr?.confidence,
          },
        });
        this.logger.log(`[OCR] Updated FileUpload #${files[0].id} với OCR results`);
      } else {
        this.logger.warn(`[OCR] Không tìm thấy FileUpload cho objectName=${objectName}`);
      }

      await job.updateProgress(100);
      await this.updateJobRecord(jobIdComposite, 'completed', 100, result);

      this.logger.log(`[OCR] Completed job ${job.id}`);
      return {
        engine: result.ocr?.engine,
        confidence: result.ocr?.confidence,
        pages: result.pages?.length || 0,
        wordCount: result.ocr?.text?.split(/\s+/).length || 0,
        extraction: result.extraction,
      };
    } catch (error: any) {
      this.logger.error(`[OCR] Failed job ${job.id}: ${error.message}`);
      await this.updateJobRecord(jobIdComposite, 'failed', job.progress as number, null, error.message);
      throw error;
    }
  }

  private async updateJobRecord(
    jobId: string,
    status: string,
    progress: number,
    result?: any,
    error?: string,
  ) {
    try {
      await this.prisma.jobRecord.upsert({
        where: { jobId },
        create: {
          jobId,
          queueName: QUEUE_NAMES.OCR,
          status,
          progress,
          result: result || undefined,
          error,
          startedAt: status === 'processing' ? new Date() : undefined,
          completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
        },
        update: {
          status,
          progress,
          result: result || undefined,
          error,
          completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to update job record: ${e}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
