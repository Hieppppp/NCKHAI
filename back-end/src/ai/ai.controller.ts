import {
  Controller, Post, Get, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { AiService } from './ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.txt'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) cb(null, true);
      else cb(new BadRequestException(`Định dạng ${ext} không được hỗ trợ`), false);
    },
  }))
  async uploadAndProcess(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
    @Body('workId') workId?: string,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');

    // Send to Python AI service (which stores file in MinIO)
    const result = await this.aiService.processFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      workId ? parseInt(workId, 10) : undefined,
    );

    // Save file record in DB pointing to MinIO object
    const record = await this.prisma.fileUpload.create({
      data: {
        filename: result.file.objectName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `minio://${result.file.objectName}`,
        category: 'MANUSCRIPT',
        uploaderId: userId,
        workId: workId ? parseInt(workId, 10) : null,
        extractedText: result.ocr?.text?.substring(0, 50000),
        extractedTitle: result.extraction?.title,
        extractedAuthors: result.extraction?.authors,
        extractedAbstract: result.extraction?.abstract,
        extractedKeywords: result.extraction?.keywords || [],
        ocrConfidence: result.ocr?.confidence,
      },
    });

    return {
      file: { id: record.id, filename: file.originalname, size: file.size, objectName: result.file.objectName },
      extraction: {
        ...result.extraction,
        text: result.ocr?.text || '',
        confidence: result.ocr?.confidence,
        engine: result.ocr?.engine,
        annotations: result.annotations || [],
        lineAnnotations: result.lineAnnotations || [],
        pages: result.pages || [],
      },
      processingTime: result.processingTime,
    };
  }

  /** Upload async qua job queue - upload nhanh vào MinIO, OCR chạy nền */
  @Post('upload-async')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.txt'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) cb(null, true);
      else cb(new BadRequestException(`Định dạng ${ext} không được hỗ trợ`), false);
    },
  }))
  async uploadAsync(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
    @Body('workId') workId?: string,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');

    // 1. Upload vào MinIO (nhanh, không OCR)
    const formData = new FormData();
    const blob = new Blob([file.buffer as any], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    const uploadResp = await fetch(`${AI_SERVICE_URL}/upload-only`, {
      method: 'POST',
      body: formData as any,
    });
    if (!uploadResp.ok) {
      throw new BadRequestException('Upload MinIO thất bại');
    }
    const uploaded: any = await uploadResp.json();

    // 2. Tạo FileUpload record (chưa có OCR)
    const fileRecord = await this.prisma.fileUpload.create({
      data: {
        filename: uploaded.objectName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `minio://${uploaded.objectName}`,
        category: 'MANUSCRIPT',
        uploaderId: userId,
        workId: workId ? parseInt(workId, 10) : null,
      },
    });

    // 3. Push OCR job vào queue
    const job = await this.queue.queueOcr({
      objectName: uploaded.objectName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      userId,
      workId: workId ? parseInt(workId, 10) : undefined,
    });

    return {
      message: 'Upload thành công, OCR đang xử lý nền',
      jobId: job.jobId,
      file: { id: fileRecord.id, objectName: uploaded.objectName, originalName: file.originalname },
    };
  }

  @Post('similarity')
  async checkSimilarity(
    @Body('text') text: string,
    @Body('workId') workId?: number,
  ) {
    if (!text || text.trim().length < 20) {
      throw new BadRequestException('Văn bản phải có ít nhất 20 ký tự');
    }
    return this.aiService.checkSimilarity(text, workId);
  }

  @Get('suggest-experts/:workId')
  suggestExperts(@Param('workId', ParseIntPipe) workId: number) {
    return this.aiService.suggestExperts(workId);
  }

  @Get('trends')
  analyzeTrends() {
    return this.aiService.analyzeTrends();
  }

  @Post('extract-keywords')
  async extractKeywords(@Body('text') text: string) {
    if (!text) throw new BadRequestException('Thiếu text');
    return this.aiService.extractKeywords(text, 15);
  }

  @Post('chat')
  async chat(@Body('message') message: string) {
    if (!message || message.trim().length < 2) {
      throw new BadRequestException('Tin nhắn quá ngắn');
    }
    return this.aiService.chat(message);
  }

  @Post('summarize')
  async summarize(@Body('text') text: string, @Body('maxWords') maxWords?: number) {
    if (!text || text.trim().length < 20) {
      throw new BadRequestException('Văn bản phải có ít nhất 20 ký tự');
    }
    return this.aiService.summarize(text, maxWords || 200);
  }

  @Get('files/:objectName/url')
  async getFileUrl(@Param('objectName') objectName: string) {
    const url = await this.aiService.getFileUrl(objectName);
    return { url };
  }
}
