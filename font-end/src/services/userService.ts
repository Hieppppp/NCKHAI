import api from './api';
import type { User, PaginatedResponse, UserStats, Role } from '../types';

export const userService = {
  async getAll(page = 1, limit = 20, search?: string): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const { data } = await api.get<PaginatedResponse<User>>(`/users?${params}`);
    return data;
  },

  async getOne(id: number): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async update(id: number, payload: { name?: string; role?: Role; isActive?: boolean; password?: string }): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async getStats(): Promise<UserStats> {
    const { data } = await api.get<UserStats>('/users/stats');
    return data;
  },
};
