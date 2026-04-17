import api from './api';

export interface JobRecord {
  id: number;
  jobId: string;
  queueName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  input?: any;
  result?: any;
  error?: string;
  userId?: number;
  workId?: number;
  fileId?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  data: JobRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface JobStats {
  queues: Record<string, { active: number; waiting: number; completed: number; failed: number; delayed: number }>;
  byStatus: Record<string, number>;
  totalRecords: number;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
};

export const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#2563eb',
  completed: '#10b981',
  failed: '#dc2626',
};

export const QUEUE_LABEL: Record<string, string> = {
  'ocr-processing': 'OCR tài liệu',
  'ai-summarize': 'Tóm tắt AI',
  'ai-embedding': 'Vector hóa AI',
  'email': 'Gửi email',
  'report': 'Báo cáo',
};

export const jobService = {
  async list(params: {
    page?: number; limit?: number; status?: string; queueName?: string; all?: boolean;
  } = {}): Promise<JobListResponse> {
    const { data } = await api.get('/jobs', { params });
    return data;
  },

  async getOne(jobId: string): Promise<JobRecord | null> {
    const { data } = await api.get(`/jobs/${jobId}`);
    return data;
  },

  async getStats(): Promise<JobStats> {
    const { data } = await api.get('/jobs/admin/stats');
    return data;
  },

  async retry(jobId: string) {
    const { data } = await api.post(`/jobs/${jobId}/retry`);
    return data;
  },

  async remove(jobId: string) {
    const { data } = await api.delete(`/jobs/${jobId}`);
    return data;
  },

  async clean(olderThanHours: number) {
    const { data } = await api.post('/jobs/admin/clean', { olderThanHours });
    return data;
  },
};
