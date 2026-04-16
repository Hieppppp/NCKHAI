import api from './api';

export const templateService = {
  async getAll(category?: string) {
    const params = category ? { category } : {};
    const { data } = await api.get('/templates', { params });
    return data;
  },

  async getOne(id: number) {
    const { data } = await api.get(`/templates/${id}`);
    return data;
  },

  async create(payload: {
    name: string; code: string; category: string; description?: string;
    content: string; headerHtml?: string; footerHtml?: string; variables?: string[];
  }) {
    const { data } = await api.post('/templates', payload);
    return data;
  },

  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await api.patch(`/templates/${id}`, payload);
    return data;
  },

  async remove(id: number) {
    const { data } = await api.delete(`/templates/${id}`);
    return data;
  },

  async getVariables(group?: string) {
    const params = group ? { group } : {};
    const { data } = await api.get('/templates/variables/all', { params });
    return data;
  },

  async createVariable(payload: {
    key: string; label: string; source: string;
    group?: string; dataType?: string; description?: string;
  }) {
    const { data } = await api.post('/templates/variables', payload);
    return data;
  },

  async preview(id: number, context: { workId?: number; committeeId?: number; userId?: number }) {
    const { data } = await api.post(`/templates/${id}/preview`, context);
    return data;
  },

  async render(id: number, context: { workId?: number; committeeId?: number; userId?: number; overrides?: Record<string, string> }) {
    const { data } = await api.post(`/templates/${id}/render`, context);
    return data;
  },

  async getDocuments(query?: { workId?: number; templateId?: number }) {
    const { data } = await api.get('/templates/documents/history', { params: query });
    return data;
  },

  async getDocument(id: number) {
    const { data } = await api.get(`/templates/documents/${id}`);
    return data;
  },
};
