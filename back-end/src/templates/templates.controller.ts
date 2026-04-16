import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { TemplatesService } from './templates.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('templates')
export class TemplatesController {
  constructor(private svc: TemplatesService) {}

  // ─── Template CRUD ─────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() data: { name: string; code: string; category: string; description?: string; content: string; headerHtml?: string; footerHtml?: string; variables?: string[] },
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.create(data, userId);
  }

  @Get()
  findAll(@Query('category') category?: string) {
    return this.svc.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: string; content?: string; headerHtml?: string; footerHtml?: string; description?: string; variables?: string[] },
  ) {
    return this.svc.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  // ─── Variables ─────────────────────────────────────────

  @Get('variables/all')
  getAllVariables(@Query('group') group?: string) {
    return this.svc.getAllVariables(group);
  }

  @Post('variables')
  @Roles(Role.ADMIN)
  createVariable(@Body() data: { key: string; label: string; description?: string; source: string; group?: string; dataType?: string; format?: string }) {
    return this.svc.createVariable(data);
  }

  // ─── Render ────────────────────────────────────────────

  @Post(':id/render')
  render(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { workId?: number; committeeId?: number; userId?: number; overrides?: Record<string, string> },
    @CurrentUser('id') renderUserId: number,
  ) {
    return this.svc.render(id, body, body.overrides, renderUserId);
  }

  @Post(':id/preview')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { workId?: number; committeeId?: number; userId?: number },
  ) {
    return this.svc.preview(id, body);
  }

  // ─── Rendered Documents ────────────────────────────────

  @Get('documents/history')
  getDocuments(@Query('workId') workId?: string, @Query('templateId') templateId?: string) {
    return this.svc.getRenderedDocuments({
      workId: workId ? +workId : undefined,
      templateId: templateId ? +templateId : undefined,
    });
  }

  @Get('documents/:id')
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getRenderedDocument(id);
  }

  /** Upload Word file → convert to HTML for template editing */
  @Post('upload-docx')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) cb(null, true);
      else cb(new BadRequestException('Chỉ hỗ trợ file .docx'), false);
    },
  }))
  async uploadDocx(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file .docx');
    return this.svc.convertDocxToHtml(file.buffer, file.originalname, file.mimetype);
  }
}
