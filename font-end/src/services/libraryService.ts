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

  async create(data: {
    title: string;
    authors: string;
    abstract?: string;
    keywords?: string[];
    tags?: string[];
    category?: string;
    type: string;
    level?: string;
  }) {
    const res = await api.post('/library', data);
    return res.data;
  },

  async update(id: number, data: Record<string, unknown>) {
    const res = await api.patch(`/library/${id}`, data);
    return res.data;
  },

  async remove(id: number) {
    const res = await api.delete(`/library/${id}`);
    return res.data;
  },

  async chat(message: string) {
    const res = await api.post('/ai/chat', { message });
    return { reply: res.data.reply || res.data.answer || 'Không có phản hồi.' };
  },
};
