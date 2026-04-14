import api from './api';

export const financeService = {
  async getStats() {
    const res = await api.get('/finance/stats');
    return res.data;
  },

  async getBudgets(params?: { fiscalYear?: number; department?: string }) {
    const res = await api.get('/finance/budgets', { params });
    return res.data;
  },

  async createBudget(data: { name: string; totalAmount: number; fiscalYear: number; department?: string }) {
    const res = await api.post('/finance/budgets', data);
    return res.data;
  },

  async getTransactions(params?: { page?: number; limit?: number; budgetId?: number; status?: string; type?: string }) {
    const res = await api.get('/finance/transactions', { params });
    return res.data;
  },

  async createTransaction(data: { amount: number; type: string; description?: string; budgetId: number; workId?: number }) {
    const res = await api.post('/finance/transactions', data);
    return res.data;
  },

  async updateTransactionStatus(id: number, status: string) {
    const res = await api.patch(`/finance/transactions/${id}/status`, { status });
    return res.data;
  },

  async getRewards(params?: { page?: number; limit?: number; status?: string; period?: string; type?: string }) {
    const res = await api.get('/finance/rewards', { params });
    return res.data;
  },

  async createReward(data: { title: string; type: string; amount?: number; period?: string; userId: number; workId?: number }) {
    const res = await api.post('/finance/rewards', data);
    return res.data;
  },

  async updateRewardStatus(id: number, status: string) {
    const res = await api.patch(`/finance/rewards/${id}/status`, { status });
    return res.data;
  },

  async getDisbursementProgress() {
    const res = await api.get('/finance/disbursement-progress');
    return res.data;
  },

  async getFeaturedPublications() {
    const res = await api.get('/finance/featured-publications');
    return res.data;
  },
};
