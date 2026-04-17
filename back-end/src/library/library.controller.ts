import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { LibraryService } from './library.service.js';
import { CreateLibraryDocumentDto, UpdateLibraryDocumentDto } from './dto/library.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('library')
export class LibraryController {
  constructor(private svc: LibraryService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  create(@Body() dto: CreateLibraryDocumentDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, type, level, category, tag,
    });
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLibraryDocumentDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  /** Upload file cho tài liệu thư viện (MinIO) */
  @Post(':id/upload')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    return this.svc.uploadFile(id, file.buffer, file.originalname, file.mimetype, file.size, userId);
  }

  /** Lấy presigned URL download */
  @Get(':id/download')
  async downloadFile(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getDownloadUrl(id);
  }
}
