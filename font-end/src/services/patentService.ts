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

  // ─── Hồ sơ đính kèm ───
  async uploadFile(patentId: number, file: File, category?: string) {
    const form = new FormData();
    form.append('file', file);
    if (category) form.append('category', category);
    const { data } = await api.post(`/patents/${patentId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
    });
    return data;
  },
  async getFiles(patentId: number) {
    const { data } = await api.get(`/patents/${patentId}/files`);
    return data;
  },
  async downloadFile(fileId: number) {
    const { data } = await api.get(`/patents/files/${fileId}/download`);
    return data as { url: string; originalName: string; mimeType: string };
  },
  async deleteFile(fileId: number) {
    const { data } = await api.delete(`/patents/files/${fileId}`);
    return data;
  },
};
