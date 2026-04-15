import api from './api';

export const settingsService = {
  async getSystemConfigs() {
    const { data } = await api.get('/settings/system');
    return data;
  },

  async updateSystemConfigs(configs: { key: string; value: string }[]) {
    const { data } = await api.patch('/settings/system', { configs });
    return data;
  },

  async getUserPreferences() {
    const { data } = await api.get('/settings/preferences');
    return data;
  },

  async setUserPreferences(prefs: Record<string, string>) {
    const { data } = await api.post('/settings/preferences', prefs);
    return data;
  },

  async getNotificationSettings() {
    const { data } = await api.get('/settings/notifications');
    return data;
  },

  async getSystemInfo() {
    const { data } = await api.get('/settings/info');
    return data;
  },
};
