import api from './api';

export const publicationService = {
  async create(data: {
    title: string;
    authors: string;
    abstract?: string;
    journalName?: string;
    conferenceName?: string;
    publishedDate?: string;
    doi?: string;
    issn?: string;
    keywords?: string[];
    confidence?: number;
    fileId?: number;
    workId?: number;
  }) {
    const res = await api.post('/publications', data);
    return res.data;
  },

  async confirm(id: number) {
    const res = await api.post(`/publications/${id}/confirm`);
    return res.data;
  },

  async findAll(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const res = await api.get('/publications', { params });
    return res.data;
  },

  async findMy() {
    const res = await api.get('/publications/my');
    return res.data;
  },

  async findOne(id: number) {
    const res = await api.get(`/publications/${id}`);
    return res.data;
  },

  async update(id: number, data: Record<string, unknown>) {
    const res = await api.patch(`/publications/${id}`, data);
    return res.data;
  },

  async remove(id: number) {
    const res = await api.delete(`/publications/${id}`);
    return res.data;
  },
};
