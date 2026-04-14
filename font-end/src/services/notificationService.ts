import api from './api';

export const notificationService = {
  async getAll(unreadOnly = false) {
    const { data } = await api.get(`/notifications${unreadOnly ? '?unread=true' : ''}`);
    return data;
  },
  async getUnreadCount() {
    const { data } = await api.get('/notifications/count');
    return data as { count: number };
  },
  async markAsRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
  },
  async markAllAsRead() {
    await api.patch('/notifications/read-all');
  },
};
