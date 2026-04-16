import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TemplateCategory } from '@prisma/client';

/**
 * Template Engine - Render mẫu tài liệu động
 *
 * Flow: Template (HTML + {{keys}}) + Data Sources → Rendered HTML → Export/Print
 */
@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  // ─── Template CRUD ─────────────────────────────────────

  async create(data: {
    name: string;
    code: string;
    category: string;
    description?: string;
    content: string;
    headerHtml?: string;
    footerHtml?: string;
    variables?: string[];
  }, userId: number) {
    // Auto-detect variables from content
    const detectedVars = this.extractVariables(data.content);
    const allVars = [...new Set([...(data.variables || []), ...detectedVars])];

    return this.prisma.documentTemplate.create({
      data: {
        name: data.name,
        code: data.code,
        category: data.category as TemplateCategory,
        description: data.description,
        content: data.content,
        headerHtml: data.headerHtml,
        footerHtml: data.footerHtml,
        variables: allVars,
        createdById: userId,
      },
    });
  }

  async findAll(category?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;

    return this.prisma.documentTemplate.findMany({
      where,
      select: {
        id: true, name: true, code: true, category: true,
        description: true, variables: true, version: true,
        isActive: true, createdAt: true, updatedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const tpl = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!tpl) throw new NotFoundException(`Template #${id} không tồn tại`);
    return tpl;
  }

  async update(id: number, data: {
    name?: string;
    content?: string;
    headerHtml?: string;
    footerHtml?: string;
    description?: string;
    variables?: string[];
  }) {
    const tpl = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException(`Template #${id} không tồn tại`);

    const updateData: Record<string, unknown> = { version: tpl.version + 1 };
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.headerHtml !== undefined) updateData.headerHtml = data.headerHtml;
    if (data.footerHtml !== undefined) updateData.footerHtml = data.footerHtml;

    if (data.content) {
      updateData.content = data.content;
      const detected = this.extractVariables(data.content);
      updateData.variables = [...new Set([...(data.variables || []), ...detected])];
    }

    return this.prisma.documentTemplate.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    await this.prisma.documentTemplate.update({ where: { id }, data: { isActive: false } });
    return { message: 'Đã xóa template' };
  }

  // ─── Variable Management ───────────────────────────────

  async getAllVariables(group?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (group) where.group = group;

    return this.prisma.templateVariable.findMany({
      where,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  async createVariable(data: {
    key: string; label: string; description?: string;
    source: string; group?: string; dataType?: string; format?: string;
  }) {
    return this.prisma.templateVariable.create({ data });
  }

  // ─── RENDER ENGINE (Core) ──────────────────────────────

  /**
   * Render template với dữ liệu thật từ DB.
   * @param templateId - ID template
   * @param context - { workId?, committeeId?, userId? } để query data
   * @param overrides - Ghi đè giá trị thủ công { "ten_de_tai": "..." }
   */
  async render(
    templateId: number,
    context: { workId?: number; committeeId?: number; userId?: number },
    overrides?: Record<string, string>,
    renderUserId?: number,
  ) {
    const tpl = await this.findOne(templateId);

    // 1. Load variable definitions
    const variables = await this.prisma.templateVariable.findMany({
      where: { key: { in: tpl.variables }, isActive: true },
    });

    // 2. Load source data
    const data = await this.loadSourceData(variables, context);

    // 3. Apply overrides
    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        data[k] = v;
      }
    }

    // 4. Replace {{keys}} in template
    let html = tpl.content;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, String(value ?? ''));
    }

    // Remove unreplaced placeholders
    html = html.replace(/\{\{[^}]+\}\}/g, '');

    // 5. Wrap with header/footer
    const fullHtml = [tpl.headerHtml || '', html, tpl.footerHtml || ''].join('\n');

    // 6. Save rendered document
    const doc = await this.prisma.renderedDocument.create({
      data: {
        templateId,
        name: `${tpl.code}-${Date.now()}`,
        htmlContent: fullHtml,
        sourceData: data,
        workId: context.workId,
        committeeId: context.committeeId,
        userId: context.userId,
        createdById: renderUserId || 1,
      },
    });

    return {
      id: doc.id,
      name: doc.name,
      html: fullHtml,
      data,
      template: { id: tpl.id, name: tpl.name, code: tpl.code },
    };
  }

  /**
   * Preview render (không lưu DB)
   */
  async preview(templateId: number, context: { workId?: number; committeeId?: number; userId?: number }) {
    const tpl = await this.findOne(templateId);
    const variables = await this.prisma.templateVariable.findMany({
      where: { key: { in: tpl.variables }, isActive: true },
    });
    const data = await this.loadSourceData(variables, context);

    let html = tpl.content;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value ?? ''));
    }
    html = html.replace(/\{\{[^}]+\}\}/g, '<span style="background:#fef3c7;color:#b45309;padding:0 4px;border-radius:2px">[chưa có dữ liệu]</span>');

    return { html: [tpl.headerHtml || '', html, tpl.footerHtml || ''].join('\n'), data };
  }

  // ─── Rendered Document History ─────────────────────────

  async getRenderedDocuments(query: { workId?: number; templateId?: number; limit?: number }) {
    const where: Record<string, unknown> = {};
    if (query.workId) where.workId = query.workId;
    if (query.templateId) where.templateId = query.templateId;

    return this.prisma.renderedDocument.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, code: true, category: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
    });
  }

  async getRenderedDocument(id: number) {
    const doc = await this.prisma.renderedDocument.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!doc) throw new NotFoundException(`Document #${id} không tồn tại`);
    return doc;
  }

  // ─── Private Helpers ───────────────────────────────────

  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
  }

  /**
   * Load dữ liệu thật từ DB theo variable source mapping.
   * Source format: "Table.field" hoặc "Table.relation.field"
   */
  private async loadSourceData(
    variables: { key: string; source: string; dataType: string; format: string | null }[],
    context: { workId?: number; committeeId?: number; userId?: number },
  ): Promise<Record<string, string>> {
    const data: Record<string, string> = {};

    // Load related entities once
    let work: Record<string, any> | null = null;
    let committee: Record<string, any> | null = null;
    let user: Record<string, any> | null = null;

    if (context.workId) {
      work = await this.prisma.scientificWork.findUnique({
        where: { id: context.workId },
        include: {
          user: { select: { name: true, email: true, department: true, phone: true } },
          reviews: { include: { reviewer: { select: { name: true } } } },
        },
      });
    }

    if (context.committeeId) {
      committee = await this.prisma.committee.findUnique({
        where: { id: context.committeeId },
        include: {
          work: true,
          members: { include: { user: { select: { name: true, specialization: true } } } },
          reviews: { include: { reviewer: { select: { name: true } } } },
        },
      });
    }

    if (context.userId) {
      user = await this.prisma.user.findUnique({ where: { id: context.userId } });
    }

    // System data
    const systemData: Record<string, string> = {
      ngay_hien_tai: new Date().toLocaleDateString('vi-VN'),
      nam_hien_tai: String(new Date().getFullYear()),
      ten_truong: '',
    };

    // Load system configs
    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: ['system.university', 'system.name'] } },
    });
    for (const c of configs) {
      if (c.key === 'system.university') systemData.ten_truong = c.value;
      if (c.key === 'system.name') systemData.ten_he_thong = c.value;
    }

    // Map each variable
    for (const v of variables) {
      const [table, field] = v.source.split('.');
      let value: string | null = null;

      switch (table) {
        case 'ScientificWork':
          if (work) value = this.getNestedValue(work, field);
          break;
        case 'Committee':
          if (committee) value = this.getNestedValue(committee, field);
          break;
        case 'User':
          if (user) value = this.getNestedValue(user, field);
          else if (work?.user) value = this.getNestedValue(work.user, field);
          break;
        case 'System':
          value = systemData[field] || systemData[v.key] || null;
          break;
        case 'Review':
          if (committee?.reviews?.length) {
            const avg = committee.reviews.reduce((s: number, r: any) => s + (r[field] || 0), 0) / committee.reviews.length;
            value = v.dataType === 'number' ? avg.toFixed(1) : String(avg);
          } else if (work?.reviews?.length) {
            const avg = work.reviews.reduce((s: number, r: any) => s + (r[field] || 0), 0) / work.reviews.length;
            value = v.dataType === 'number' ? avg.toFixed(1) : String(avg);
          }
          break;
      }

      // Format
      if (value != null) {
        if (v.dataType === 'date' && !isNaN(Date.parse(value))) {
          value = new Date(value).toLocaleDateString('vi-VN');
        } else if (v.dataType === 'number' && !isNaN(+value)) {
          value = (+value).toLocaleString('vi-VN');
        }
      }

      data[v.key] = value ?? '';
    }

    // Always add system vars
    Object.assign(data, systemData);

    return data;
  }

  /**
   * Upload Word .docx → convert to HTML via AI service
   */
  async convertDocxToHtml(fileBuffer: Buffer, filename: string, mimeType: string) {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

    const boundary = '----DocxBoundary' + Date.now();
    const parts: Buffer[] = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const response = await fetch(`${AI_SERVICE_URL}/convert-docx`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Convert failed: ${err}`);
    }

    return response.json();
  }

  private getNestedValue(obj: Record<string, any>, path: string): string | null {
    const parts = path.split('.');
    let current: any = obj;
    for (const p of parts) {
      if (current == null) return null;
      current = current[p];
    }
    if (current == null) return null;
    if (Array.isArray(current)) return current.join(', ');
    if (current instanceof Date) return current.toLocaleDateString('vi-VN');
    return String(current);
  }
}
