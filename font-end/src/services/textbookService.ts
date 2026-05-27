import api from './api';

export const textbookService = {
  async getAll(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const { data } = await api.get(`/textbooks${query}`);
    return data;
  },
  async getOne(id: number) {
    const { data } = await api.get(`/textbooks/${id}`);
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await api.post('/textbooks', payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await api.patch(`/textbooks/${id}`, payload);
    return data;
  },
  async remove(id: number) {
    await api.delete(`/textbooks/${id}`);
  },
};
