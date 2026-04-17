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

  // ─── File Upload/Download (MinIO) ───
  async uploadFile(workId: number, file: File, category?: string) {
    const form = new FormData();
    form.append('file', file);
    if (category) form.append('category', category);
    const { data } = await api.post(`/works/${workId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  async getFiles(workId: number) {
    const { data } = await api.get(`/works/${workId}/files`);
    return data;
  },

  async downloadFile(fileId: number) {
    const { data } = await api.get(`/works/files/${fileId}/download`);
    return data as { url: string; originalName: string; mimeType: string };
  },

  async deleteFile(fileId: number) {
    const { data } = await api.delete(`/works/files/${fileId}`);
    return data;
  },
};
