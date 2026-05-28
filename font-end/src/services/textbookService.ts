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

  // ─── Hồ sơ đính kèm ───
  async uploadFile(textbookId: number, file: File, category?: string) {
    const form = new FormData();
    form.append('file', file);
    if (category) form.append('category', category);
    const { data } = await api.post(`/textbooks/${textbookId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
    });
    return data;
  },
  async getFiles(textbookId: number) {
    const { data } = await api.get(`/textbooks/${textbookId}/files`);
    return data;
  },
  async downloadFile(fileId: number) {
    const { data } = await api.get(`/textbooks/files/${fileId}/download`);
    return data as { url: string; originalName: string; mimeType: string };
  },
  async deleteFile(fileId: number) {
    const { data } = await api.delete(`/textbooks/files/${fileId}`);
    return data;
  },
};
