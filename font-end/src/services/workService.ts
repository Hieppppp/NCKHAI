import api from './api';

export const workService = {
  async getAll(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const { data } = await api.get(`/works${query}`);
    return data;
  },
  async getMy(page = 1) {
    const { data } = await api.get(`/works/my?page=${page}`);
    return data;
  },
  async getOne(id: number) {
    const { data } = await api.get(`/works/${id}`);
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await api.post('/works', payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await api.patch(`/works/${id}`, payload);
    return data;
  },
  async remove(id: number) {
    await api.delete(`/works/${id}`);
  },
  async getWorkflow(id: number) {
    const { data } = await api.get(`/works/${id}/workflow`);
    return data;
  },
};
