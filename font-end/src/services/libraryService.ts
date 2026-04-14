import api from './api';

export const libraryService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    level?: string;
    category?: string;
    tag?: string;
  }) {
    const res = await api.get('/library', { params });
    return res.data;
  },

  async findOne(id: number) {
    const res = await api.get(`/library/${id}`);
    return res.data;
  },

  async getStats() {
    const res = await api.get('/library/stats');
    return res.data;
  },
};
