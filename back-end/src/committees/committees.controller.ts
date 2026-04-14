import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommitteesService } from './committees.service.js';
import { CreateCommitteeDto, SubmitReviewDto } from './dto/create-committee.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('committees')
export class CommitteesController {
  constructor(private svc: CommitteesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCommitteeDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll(@Query('workId') workId?: string) {
    return this.svc.findAll(workId ? +workId : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post('review')
  @Roles(Role.ADMIN, Role.REVIEWER, Role.LECTURER)
  submitReview(@Body() dto: SubmitReviewDto, @CurrentUser('id') reviewerId: number) {
    return this.svc.submitReview(dto, reviewerId);
  }
}
