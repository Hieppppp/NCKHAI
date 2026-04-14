import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`Người dùng #${id} không tồn tại`);
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto, currentUserId: number) {
    const target = await this.prisma.user.findUnique({ where: { id } });

    if (!target) {
      throw new NotFoundException(`Người dùng #${id} không tồn tại`);
    }

    if (target.role === Role.ADMIN && id !== currentUserId && dto.role && dto.role !== Role.ADMIN) {
      throw new ForbiddenException('Không thể thay đổi vai trò của quản trị viên khác');
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new ForbiddenException('Không thể xóa chính mình');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Người dùng #${id} không tồn tại`);
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Không thể xóa tài khoản quản trị viên');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: `Đã xóa người dùng #${id}` };
  }

  async getStats() {
    const [total, byRole, active, inactive] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
    ]);

    const roleStats = Object.fromEntries(
      byRole.map((r) => [r.role, r._count.role]),
    );

    return { total, active, inactive, byRole: roleStats };
  }
}
