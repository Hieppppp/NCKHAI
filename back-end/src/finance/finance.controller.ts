import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FinanceService } from './finance.service.js';
import {
  CreateBudgetDto,
  CreateTransactionDto,
  UpdateTransactionStatusDto,
  CreateRewardDto,
  UpdateRewardStatusDto,
} from './dto/finance.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('finance')
export class FinanceController {
  constructor(private svc: FinanceService) {}

  // ─── Stats ────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  // ─── Budget ───────────────────────────────────────────
  @Post('budgets')
  @Roles(Role.ADMIN)
  createBudget(@Body() dto: CreateBudgetDto) {
    return this.svc.createBudget(dto);
  }

  @Get('budgets')
  findAllBudgets(
    @Query('fiscalYear') fiscalYear?: string,
    @Query('department') department?: string,
  ) {
    return this.svc.findAllBudgets({
      fiscalYear: fiscalYear ? +fiscalYear : undefined,
      department,
    });
  }

  // ─── Transactions ─────────────────────────────────────
  @Post('transactions')
  @Roles(Role.ADMIN)
  createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser('id') userId: number) {
    return this.svc.createTransaction(dto, userId);
  }

  @Get('transactions')
  findAllTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('budgetId') budgetId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.findAllTransactions({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      budgetId: budgetId ? +budgetId : undefined,
      status,
      type,
    });
  }

  @Patch('transactions/:id/status')
  @Roles(Role.ADMIN)
  updateTransactionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionStatusDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.updateTransactionStatus(id, dto, userId);
  }

  // ─── Rewards ──────────────────────────────────────────
  @Post('rewards')
  @Roles(Role.ADMIN)
  createReward(@Body() dto: CreateRewardDto, @CurrentUser('id') userId: number) {
    return this.svc.createReward(dto, userId);
  }

  @Get('rewards')
  findAllRewards(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.findAllRewards({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      period,
      type,
    });
  }

  @Patch('rewards/:id/status')
  @Roles(Role.ADMIN)
  updateRewardStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardStatusDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.updateRewardStatus(id, dto, userId);
  }

  // ─── Extra ────────────────────────────────────────────
  @Get('disbursement-progress')
  getDisbursementProgress() {
    return this.svc.getDisbursementProgress();
  }

  @Get('featured-publications')
  getFeaturedPublications() {
    return this.svc.getFeaturedPublications();
  }
}
