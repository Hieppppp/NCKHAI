import api from './api';

export const researchHoursService = {
  async getMyHours(year?: string) {
    const params = year ? { year } : {};
    const { data } = await api.get('/research-hours/my', { params });
    return data;
  },

  async calculate(userId: number, academicYear: string) {
    const { data } = await api.post('/research-hours/calculate', { userId, academicYear });
    return data;
  },

  async getSummary(year?: string) {
    const params = year ? { year } : {};
    const { data } = await api.get('/research-hours/summary', { params });
    return data;
  },

  async getJournals(search?: string, category?: string) {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category) params.category = category;
    const { data } = await api.get('/research-hours/journals', { params });
    return data;
  },

  async createJournal(data: {
    name: string; issn?: string; publisher?: string; category?: string;
    quartile?: string; impactFactor?: number; points: number; country?: string; url?: string;
  }) {
    const { data: result } = await api.post('/research-hours/journals', data);
    return result;
  },
};
