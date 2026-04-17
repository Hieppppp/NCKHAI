import api from './api';

export interface FileItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  sizeHuman: string;
  path: string;
  category: string;
  hasOcr: boolean;
  ocrConfidence?: number;
  extractedTitle?: string;
  extractedAuthors?: string;
  extractedKeywords: string[];
  createdAt: string;
  uploader: { id: number; name: string; email: string; department?: string };
  work?: { id: number; title: string; type: string };
}

export interface FileListResponse {
  data: FileItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface FileStats {
  total: number;
  totalSize: number;
  totalSizeHuman: string;
  recentWeek: number;
  byCategory: { category: string; count: number }[];
  byMime: { mimeType: string; count: number; label: string }[];
}

export const fileService = {
  async findAll(params: {
    page?: number; limit?: number; search?: string;
    category?: string; uploaderId?: number; workId?: number;
    mimeType?: string; hasOcr?: boolean;
  } = {}): Promise<FileListResponse> {
    const { data } = await api.get('/files', { params });
    return data;
  },

  async getStats(): Promise<FileStats> {
    const { data } = await api.get('/files/stats');
    return data;
  },

  async findOne(id: number): Promise<FileItem> {
    const { data } = await api.get(`/files/${id}`);
    return data;
  },

  async getDownloadUrl(id: number): Promise<{ url: string; originalName: string; mimeType: string }> {
    const { data } = await api.get(`/files/${id}/download`);
    return data;
  },

  async remove(id: number): Promise<{ message: string }> {
    const { data } = await api.delete(`/files/${id}`);
    return data;
  },
};
