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
      select: {
        id: true, title: true, abstract: true, content: true, authors: true,
        type: true, level: true, createdAt: true, keywords: true,
        user: { select: { id: true, name: true, department: true } },
      },
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
    const data: any = await response.json();

    // Enrich results với thông tin chi tiết
    const enrichedResults = (data.results || []).map((r: any) => {
      const work = works.find((w) => w.id === r.workId);
      return {
        ...r,
        authors: work?.authors,
        type: work?.type,
        level: work?.level,
        createdAt: work?.createdAt,
        keywords: work?.keywords || [],
        user: work?.user,
        riskLevel: r.similarity > 50 ? 'high' : r.similarity > 30 ? 'medium' : r.similarity > 15 ? 'low' : 'safe',
      };
    });

    // Tổng hợp
    const maxSim = data.maxSimilarity || 0;
    const avgSim = enrichedResults.length > 0
      ? enrichedResults.reduce((s: number, r: any) => s + r.similarity, 0) / enrichedResults.length
      : 0;
    const highRiskCount = enrichedResults.filter((r: any) => r.similarity > 30).length;

    return {
      maxSimilarity: maxSim,
      avgSimilarity: Math.round(avgSim * 100) / 100,
      totalCompared: corpus.length,
      highRiskCount,
      riskLevel: maxSim > 50 ? 'critical' : maxSim > 30 ? 'high' : maxSim > 15 ? 'medium' : 'safe',
      verdict: maxSim > 50
        ? 'Phát hiện đạo văn nghiêm trọng - cần xem xét lại'
        : maxSim > 30
        ? 'Trùng lặp đáng kể - cần kiểm tra và trích dẫn'
        : maxSim > 15
        ? 'Có một số điểm tương đồng - nên tham khảo'
        : 'Nội dung an toàn, không phát hiện đạo văn',
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      results: enrichedResults,
    };
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
   * Analyze research trends - phân tích xu hướng NCKH.
   * Trả về: keywords, phân bố theo loại/cấp/năm, top authors, top departments, growth rate, insights.
   */
  async analyzeTrends() {
    const [works, users] = await Promise.all([
      this.prisma.scientificWork.findMany({
        select: {
          id: true, title: true, keywords: true, createdAt: true,
          type: true, level: true, status: true, aiScore: true, budget: true,
          user: { select: { id: true, name: true, department: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    const total = works.length;

    // Top keywords
    const kwFreq = new Map<string, number>();
    for (const w of works) {
      for (const kw of w.keywords) {
        kwFreq.set(kw, (kwFreq.get(kw) || 0) + 1);
      }
    }
    const topKeywords = Array.from(kwFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10,
      }));

    // By year + growth
    const yearFreq = new Map<number, number>();
    for (const w of works) {
      const year = w.createdAt.getFullYear();
      yearFreq.set(year, (yearFreq.get(year) || 0) + 1);
    }
    const byYear = Array.from(yearFreq.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));

    // Growth rate (so với năm trước)
    const currentYear = new Date().getFullYear();
    const thisYear = yearFreq.get(currentYear) || 0;
    const lastYear = yearFreq.get(currentYear - 1) || 0;
    const growthRate = lastYear > 0 ? Math.round(((thisYear - lastYear) / lastYear) * 100) : 0;

    // By type
    const typeFreq = new Map<string, number>();
    for (const w of works) typeFreq.set(w.type, (typeFreq.get(w.type) || 0) + 1);
    const byType = Array.from(typeFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, percentage: Math.round((count / total) * 100 * 10) / 10 }));

    // By level
    const levelFreq = new Map<string, number>();
    for (const w of works) levelFreq.set(w.level, (levelFreq.get(w.level) || 0) + 1);
    const byLevel = Array.from(levelFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([level, count]) => ({ level, count, percentage: Math.round((count / total) * 100 * 10) / 10 }));

    // By status
    const statusFreq = new Map<string, number>();
    for (const w of works) statusFreq.set(w.status, (statusFreq.get(w.status) || 0) + 1);
    const byStatus = Array.from(statusFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }));

    // Top authors (tác giả có nhiều công trình)
    const authorFreq = new Map<string, { name: string; count: number; department: string | null }>();
    for (const w of works) {
      if (w.user) {
        const key = String(w.user.id);
        const cur = authorFreq.get(key) || { name: w.user.name || 'N/A', count: 0, department: w.user.department };
        cur.count++;
        authorFreq.set(key, cur);
      }
    }
    const topAuthors = Array.from(authorFreq.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top departments
    const deptFreq = new Map<string, number>();
    for (const w of works) {
      const dept = w.user?.department;
      if (dept) deptFreq.set(dept, (deptFreq.get(dept) || 0) + 1);
    }
    const topDepartments = Array.from(deptFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([department, count]) => ({ department, count }));

    // Budget analysis
    const worksWithBudget = works.filter(w => w.budget);
    const totalBudget = worksWithBudget.reduce((s, w) => s + (w.budget || 0), 0);
    const avgBudget = worksWithBudget.length > 0 ? totalBudget / worksWithBudget.length : 0;

    // AI score distribution
    const worksWithScore = works.filter(w => w.aiScore);
    const avgAiScore = worksWithScore.length > 0
      ? worksWithScore.reduce((s, w) => s + (w.aiScore || 0), 0) / worksWithScore.length
      : 0;

    // Insights
    const insights: string[] = [];
    if (topKeywords[0]) insights.push(`"${topKeywords[0].keyword}" là từ khóa xuất hiện nhiều nhất (${topKeywords[0].count} công trình)`);
    if (growthRate !== 0) insights.push(`Số công trình ${growthRate > 0 ? 'tăng' : 'giảm'} ${Math.abs(growthRate)}% so với năm ${currentYear - 1}`);
    if (byLevel[0]) insights.push(`Phần lớn công trình ở ${byLevel[0].level === 'STATE' ? 'cấp Nhà nước' : byLevel[0].level === 'MINISTRY' ? 'cấp Bộ' : 'cấp Trường'} (${byLevel[0].percentage}%)`);
    if (topDepartments[0]) insights.push(`${topDepartments[0].department} dẫn đầu với ${topDepartments[0].count} công trình`);
    if (avgAiScore > 0) insights.push(`Điểm AI trung bình: ${avgAiScore.toFixed(1)}/100`);

    return {
      overview: {
        total,
        totalUsers: users,
        totalBudget,
        avgBudget: Math.round(avgBudget),
        avgAiScore: Math.round(avgAiScore * 10) / 10,
        growthRate,
        thisYear,
        lastYear,
      },
      topKeywords,
      byYear,
      byType,
      byLevel,
      byStatus,
      topAuthors,
      topDepartments,
      insights,
    };
  }

  /** @deprecated dùng analyzeTrends() thay thế */
  async _analyzeTrendsFallback() {
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
