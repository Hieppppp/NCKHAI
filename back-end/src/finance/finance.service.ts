import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { callDbFunction } from '../prisma/db-functions.js';
import {
  CreateBudgetDto,
  CreateTransactionDto,
  UpdateTransactionStatusDto,
  CreateRewardDto,
  UpdateRewardStatusDto,
} from './dto/finance.dto.js';
import { TransactionType, TransactionStatus, RewardType, RewardStatus } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard Stats ─────────────────────────────────
  async getStats() {
    // Ưu tiên PostgreSQL function (1 query thay 5)
    const fast = await callDbFunction<Record<string, unknown>>(
      this.prisma,
      'fn_finance_stats',
    );
    if (fast) return fast;

    // Fallback
    const budgets = await this.prisma.budget.findMany();
    const totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0);
    const totalDisbursed = budgets.reduce((s, b) => s + b.disbursedAmount, 0);

    const activeProjects = await this.prisma.scientificWork.count({
      where: { status: { in: ['IN_PROGRESS', 'REVIEW', 'REVISION'] } },
    });

    const totalRewards = await this.prisma.reward.aggregate({
      _sum: { amount: true },
      where: { status: RewardStatus.AWARDED },
    });

    const byDepartment = await this.prisma.budget.groupBy({
      by: ['department'],
      _sum: { totalAmount: true, disbursedAmount: true },
    });

    return {
      totalBudget,
      totalDisbursed,
      activeProjects,
      totalRewards: totalRewards._sum.amount || 0,
      byDepartment,
    };
  }

  // ─── Budget CRUD ─────────────────────────────────────
  async createBudget(dto: CreateBudgetDto) {
    return this.prisma.budget.create({ data: dto });
  }

  async findAllBudgets(query: { fiscalYear?: number; department?: string }) {
    const where: Record<string, unknown> = {};
    if (query.fiscalYear) where.fiscalYear = query.fiscalYear;
    if (query.department) where.department = query.department;

    return this.prisma.budget.findMany({
      where,
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Transactions ─────────────────────────────────────
  async createTransaction(dto: CreateTransactionDto, approvedById?: number) {
    const budget = await this.prisma.budget.findUnique({ where: { id: dto.budgetId } });
    if (!budget) throw new NotFoundException(`Budget #${dto.budgetId} không tồn tại`);

    return this.prisma.budgetTransaction.create({
      data: {
        amount: dto.amount,
        type: dto.type as TransactionType,
        description: dto.description,
        budgetId: dto.budgetId,
        workId: dto.workId,
        approvedById,
      },
      include: {
        budget: { select: { id: true, name: true } },
        work: { select: { id: true, title: true } },
      },
    });
  }

  async findAllTransactions(query: { page?: number; limit?: number; budgetId?: number; status?: string; type?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.budgetId) where.budgetId = query.budgetId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.budgetTransaction.findMany({
        where,
        include: {
          budget: { select: { id: true, name: true, department: true } },
          work: { select: { id: true, title: true, authors: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.budgetTransaction.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateTransactionStatus(id: number, dto: UpdateTransactionStatusDto, approvedById: number) {
    const tx = await this.prisma.budgetTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException(`Transaction #${id} không tồn tại`);

    const updated = await this.prisma.budgetTransaction.update({
      where: { id },
      data: {
        status: dto.status as TransactionStatus,
        approvedById,
      },
    });

    // If approved disbursement, update budget
    if (dto.status === 'COMPLETED' && tx.type === 'DISBURSEMENT') {
      await this.prisma.budget.update({
        where: { id: tx.budgetId },
        data: { disbursedAmount: { increment: tx.amount } },
      });
    }
    if (dto.status === 'COMPLETED' && tx.type === 'ALLOCATION') {
      await this.prisma.budget.update({
        where: { id: tx.budgetId },
        data: { allocatedAmount: { increment: tx.amount } },
      });
    }

    return updated;
  }

  // ─── Rewards ──────────────────────────────────────────
  async createReward(dto: CreateRewardDto, approvedById?: number) {
    return this.prisma.reward.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type as RewardType,
        amount: dto.amount,
        period: dto.period,
        userId: dto.userId,
        workId: dto.workId,
        approvedById,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        work: { select: { id: true, title: true } },
      },
    });
  }

  async findAllRewards(query: { page?: number; limit?: number; status?: string; period?: string; type?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.period) where.period = query.period;
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          work: { select: { id: true, title: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateRewardStatus(id: number, dto: UpdateRewardStatusDto, approvedById: number) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException(`Reward #${id} không tồn tại`);

    return this.prisma.reward.update({
      where: { id },
      data: {
        status: dto.status as RewardStatus,
        approvedById,
      },
      include: {
        user: { select: { id: true, name: true } },
        work: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Disbursement Progress (Tiến độ giải ngân) ────────
  async getDisbursementProgress() {
    const transactions = await this.prisma.budgetTransaction.findMany({
      where: { type: 'DISBURSEMENT', status: 'COMPLETED' },
      include: {
        work: { select: { id: true, title: true } },
        budget: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return transactions;
  }

  // ─── Featured publications (Công bố tiêu biểu) ───────
  async getFeaturedPublications() {
    return this.prisma.publication.findMany({
      where: { status: 'CONFIRMED' },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
  }
}
