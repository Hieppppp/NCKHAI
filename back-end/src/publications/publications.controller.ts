import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PublicationsService } from './publications.service.js';
import { CreatePublicationDto, UpdatePublicationDto } from './dto/create-publication.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('publications')
export class PublicationsController {
  constructor(private svc: PublicationsService) {}

  @Post()
  create(@Body() dto: CreatePublicationDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.svc.confirm(id, userId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @CurrentUser('id') userId?: number,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
  }

  @Get('my')
  findMy(@CurrentUser('id') userId: number) {
    return this.svc.findAll({ userId });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePublicationDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
