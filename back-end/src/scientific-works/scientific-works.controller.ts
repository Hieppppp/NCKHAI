import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('userId') userId?: string,
  ) {
    return this.svc.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search, status, type, level,
      userId: userId ? +userId : undefined,
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
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
}
