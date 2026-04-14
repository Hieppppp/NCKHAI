import api from './api';

export const committeeService = {
  async getAll(workId?: number) {
    const q = workId ? `?workId=${workId}` : '';
    const { data } = await api.get(`/committees${q}`);
    return data;
  },
  async getOne(id: number) {
    const { data } = await api.get(`/committees/${id}`);
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await api.post('/committees', payload);
    return data;
  },
  async submitReview(payload: Record<string, unknown>) {
    const { data } = await api.post('/committees/review', payload);
    return data;
  },
};
