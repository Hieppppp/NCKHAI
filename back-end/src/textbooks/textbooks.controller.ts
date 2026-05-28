import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { TextbooksService } from './textbooks.service.js';
import { CreateTextbookDto, UpdateTextbookDto } from './dto/textbook.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('textbooks')
export class TextbooksController {
  constructor(private svc: TextbooksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  create(@Body() dto: CreateTextbookDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Get()
  findAll(
    @CurrentUser('id') requesterId: number,
    @CurrentUser('role') requesterRole: Role,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('materialType') materialType?: string,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, status, materialType, requesterId, requesterRole,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') requesterId: number,
    @CurrentUser('role') requesterRole: Role,
  ) {
    return this.svc.findOne(id, requesterId, requesterRole);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTextbookDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ) {
    return this.svc.update(id, dto, userId, role);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ) {
    return this.svc.remove(id, userId, role);
  }

  // ─── Hồ sơ đính kèm ───
  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(
    @Param('id', ParseIntPipe) textbookId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string | undefined,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    return this.svc.uploadFile(textbookId, file.buffer, file.originalname, file.mimetype, file.size, userId, category);
  }

  @Get(':id/files')
  getFiles(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getFiles(id);
  }

  @Get('files/:fileId/download')
  downloadFile(@Param('fileId', ParseIntPipe) fileId: number) {
    return this.svc.getDownloadUrl(fileId);
  }

  @Delete('files/:fileId')
  deleteFile(
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ) {
    return this.svc.deleteFile(fileId, userId, role);
  }
}
