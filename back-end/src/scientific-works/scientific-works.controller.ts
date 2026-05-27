import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { ScientificWorksService } from './scientific-works.service.js';
import { CreateWorkDto } from './dto/create-work.dto.js';
import { UpdateWorkDto } from './dto/update-work.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('works')
export class ScientificWorksController {
  constructor(private svc: ScientificWorksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LECTURER, Role.STUDENT)
  create(@Body() dto: CreateWorkDto, @CurrentUser('id') userId: number) {
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
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, status, type, level, category,
      userId: userId ? +userId : undefined,
      requesterId, requesterRole,
    });
  }

  @Get('my')
  findMy(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({ userId, page: page ? +page : undefined, limit: limit ? +limit : undefined });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') requesterId: number,
    @CurrentUser('role') requesterRole: Role,
  ) {
    return this.svc.findOne(id, requesterId, requesterRole);
  }

  @Get(':id/workflow')
  getWorkflow(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getWorkflow(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
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

  /** Upload file đính kèm cho đề tài - lưu lên MinIO, DB chỉ lưu path */
  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadFile(
    @Param('id', ParseIntPipe) workId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string | undefined,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    return this.svc.uploadFile(workId, file.buffer, file.originalname, file.mimetype, file.size, userId, category);
  }

  /** Lấy danh sách file của đề tài */
  @Get(':id/files')
  getFiles(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getFiles(id);
  }

  /** Download file - trả về presigned URL từ MinIO */
  @Get('files/:fileId/download')
  async downloadFile(@Param('fileId', ParseIntPipe) fileId: number) {
    return this.svc.getDownloadUrl(fileId);
  }

  /** Xóa file */
  @Delete('files/:fileId')
  deleteFile(
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ) {
    return this.svc.deleteFile(fileId, userId, role);
  }
}
