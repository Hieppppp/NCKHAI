import api from './api';

export const aiService = {
  async uploadAndProcess(file: File, workId?: number) {
    const form = new FormData();
    form.append('file', file);
    if (workId) form.append('workId', String(workId));
    const { data } = await api.post('/ai/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // OCR can take time
    });
    return data;
  },
  /** Upload async qua job queue - trả về jobId ngay, OCR chạy nền */
  async uploadAsync(file: File, workId?: number): Promise<{ jobId: string; file: { id: number; objectName: string; originalName: string } }> {
    const form = new FormData();
    form.append('file', file);
    if (workId) form.append('workId', String(workId));
    const { data } = await api.post('/ai/upload-async', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async checkSimilarity(text: string, workId?: number) {
    const { data } = await api.post('/ai/similarity', { text, workId });
    return data;
  },
  async suggestExperts(workId: number) {
    const { data } = await api.get(`/ai/suggest-experts/${workId}`);
    return data;
  },
  async getTrends() {
    const { data } = await api.get('/ai/trends');
    return data;
  },
  async extractKeywords(text: string) {
    const { data } = await api.post('/ai/extract-keywords', { text });
    return data;
  },
  async getFileUrl(objectName: string) {
    const { data } = await api.get(`/ai/files/${objectName}/url`);
    return data.url as string;
  },
  async chat(message: string) {
    const { data } = await api.post('/ai/chat', { message });
    return data;
  },
  async summarize(text: string, maxWords = 200) {
    const { data } = await api.post('/ai/summarize', { text, maxWords });
    return data;
  },
};
