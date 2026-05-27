import api from './api';

export const patentService = {
  async getAll(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const { data } = await api.get(`/patents${query}`);
    return data;
  },
  async getOne(id: number) {
    const { data } = await api.get(`/patents/${id}`);
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await api.post('/patents', payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await api.patch(`/patents/${id}`, payload);
    return data;
  },
  async remove(id: number) {
    await api.delete(`/patents/${id}`);
  },
};
