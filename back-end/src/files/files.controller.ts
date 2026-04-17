import { Controller, Get, Delete, Param, Query, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FilesService } from './files.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('files')
export class FilesController {
  constructor(private svc: FilesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('uploaderId') uploaderId?: string,
    @Query('workId') workId?: string,
    @Query('mimeType') mimeType?: string,
    @Query('hasOcr') hasOcr?: string,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, category, mimeType,
      uploaderId: uploaderId ? +uploaderId : undefined,
      workId: workId ? +workId : undefined,
      hasOcr: hasOcr === 'true' ? true : hasOcr === 'false' ? false : undefined,
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

  @Get(':id/download')
  download(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getDownloadUrl(id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ) {
    return this.svc.remove(id, userId, role);
  }
}
