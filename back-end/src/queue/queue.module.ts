import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';
import { OcrProcessor } from './processors/ocr.processor.js';
import { SummarizeProcessor } from './processors/summarize.processor.js';
import { EmbeddingProcessor } from './processors/embedding.processor.js';
import { EmailProcessor } from './processors/email.processor.js';
import { ReportProcessor } from './processors/report.processor.js';
import { QUEUE_NAMES } from './queue.constants.js';

export { QUEUE_NAMES };

@Global()
@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: +(process.env.REDIS_PORT || 6379),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 24 * 3600 },
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.OCR },
      { name: QUEUE_NAMES.AI_SUMMARIZE },
      { name: QUEUE_NAMES.AI_EMBEDDING },
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.REPORT },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService, OcrProcessor, SummarizeProcessor, EmbeddingProcessor, EmailProcessor, ReportProcessor],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
