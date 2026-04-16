import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { callDbFunction } from '../prisma/db-functions.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Forward file to Python AI service for OCR + extraction, store in MinIO.
   */
  async processFile(fileBuffer: Buffer, filename: string, mimeType: string, workId?: number) {
    // Build multipart form manually to avoid Node.js Buffer/Blob TS issues
    const boundary = '----NckhAiBoundary' + Date.now();
    const parts: Buffer[] = [];

    // File part
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));

    // work_id part
    if (workId) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="work_id"\r\n\r\n${workId}\r\n`
      ));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const response = await fetch(`${AI_SERVICE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`AI service error: ${err}`);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check similarity via Python AI service, passing corpus from DB.
   */
  async checkSimilarity(text: string, excludeWorkId?: number) {
    const works = await this.prisma.scientificWork.findMany({
      where: excludeWorkId ? { id: { not: excludeWorkId } } : {},
      select: { id: true, title: true, abstract: true, content: true },
    });

    const corpus = works
      .map((w) => ({
        id: w.id,
        title: w.title,
        text: [w.abstract || '', w.content || ''].join(' '),
      }))
      .filter((c) => c.text.trim().length > 20);

    const response = await fetch(`${AI_SERVICE_URL}/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, corpus }),
    });

    if (!response.ok) throw new Error('Similarity check failed');
    return response.json();
  }

  /**
   * Extract keywords via Python AI service (TF-IDF).
   */
  async extractKeywords(text: string, topN = 15) {
    const response = await fetch(`${AI_SERVICE_URL}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, top_n: topN }),
    });

    if (!response.ok) throw new Error('Keyword extraction failed');
    return response.json();
  }

  /**
   * Suggest expert reviewers via Python AI service.
   */
  async suggestExperts(workId: number) {
    const work = await this.prisma.scientificWork.findUnique({
      where: { id: workId },
      select: { keywords: true, title: true, abstract: true },
    });
    if (!work) return [];

    const workText = [work.title, work.abstract || '', ...work.keywords].join(' ');

    const reviewers = await this.prisma.user.findMany({
      where: { role: { in: ['REVIEWER', 'LECTURER'] }, isActive: true },
      select: { id: true, name: true, email: true, specialization: true, department: true },
    });

    // Gather each expert's works for matching
    const experts = await Promise.all(
      reviewers.map(async (r) => {
        const rWorks = await this.prisma.scientificWork.findMany({
          where: { userId: r.id },
          select: { keywords: true, title: true },
        });
        return {
          id: r.id,
          name: r.name || r.email,
          email: r.email,
          specialization: r.specialization || '',
          works_text: rWorks.flatMap((w) => [w.title, ...w.keywords]).join(' '),
        };
      }),
    );

    const response = await fetch(`${AI_SERVICE_URL}/match-experts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_keywords: work.keywords,
        work_text: workText,
        experts,
      }),
    });

    if (!response.ok) return [];

    const matches = await response.json();

    // Enrich with email + specialization
    return matches.map((m: any) => {
      const expert = reviewers.find((r) => r.id === m.id);
      return {
        ...m,
        email: expert?.email,
        specialization: expert?.specialization,
      };
    });
  }

  /**
   * Analyze research trends.
   * PostgreSQL function (1 query) with JS fallback.
   */
  async analyzeTrends() {
    const fast = await callDbFunction<Record<string, unknown>>(
      this.prisma,
      'fn_research_trends',
    );
    if (fast) return fast;

    // Fallback
    const works = await this.prisma.scientificWork.findMany({
      select: { keywords: true, createdAt: true, type: true, level: true },
    });

    const kwFreq = new Map<string, number>();
    for (const w of works) {
      for (const kw of w.keywords) {
        kwFreq.set(kw, (kwFreq.get(kw) || 0) + 1);
      }
    }
    const topKeywords = Array.from(kwFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    const yearFreq = new Map<number, number>();
    for (const w of works) {
      const year = w.createdAt.getFullYear();
      yearFreq.set(year, (yearFreq.get(year) || 0) + 1);
    }
    const byYear = Array.from(yearFreq.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));

    const typeCount = await this.prisma.scientificWork.groupBy({ by: ['type'], _count: { type: true } });
    const byType = typeCount.map((t) => ({ type: t.type, count: t._count.type }));

    const levelCount = await this.prisma.scientificWork.groupBy({ by: ['level'], _count: { level: true } });
    const byLevel = levelCount.map((l) => ({ level: l.level, count: l._count.level }));

    return { topKeywords, byYear, byType, byLevel };
  }

  /**
   * Summarize text via Python AI service (Ollama/DeepSeek).
   */
  async summarize(text: string, maxWords = 200) {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, max_words: maxWords }),
      });

      if (!response.ok) {
        return { summary: null, error: 'LLM chưa sẵn sàng. Vui lòng kiểm tra Ollama đã chạy chưa.' };
      }

      const data = await response.json();
      return { summary: data.summary, engine: data.engine };
    } catch {
      return { summary: null, error: 'Không thể kết nối đến dịch vụ AI.' };
    }
  }

  /**
   * Chat with LLM via Python AI service.
   */
  async chat(message: string) {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message }),
      });

      if (!response.ok) {
        return { reply: 'Xin lỗi, dịch vụ AI đang không khả dụng. Vui lòng thử lại sau.' };
      }

      const data = await response.json();
      return { reply: data.answer || 'Không có phản hồi từ AI.' };
    } catch {
      return { reply: 'Xin lỗi, không thể kết nối đến dịch vụ AI. Vui lòng kiểm tra Ollama đã chạy chưa.' };
    }
  }

  /**
   * Get presigned URL for a file in MinIO.
   */
  async getFileUrl(objectName: string): Promise<string> {
    const response = await fetch(`${AI_SERVICE_URL}/files/${objectName}/url`);
    if (!response.ok) throw new Error('File not found');
    const data = await response.json();
    return data.url;
  }
}
