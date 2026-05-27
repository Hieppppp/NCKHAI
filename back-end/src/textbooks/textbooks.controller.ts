import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
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
}
