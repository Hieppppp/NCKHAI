import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ─── System Config (Admin) ─────────────────────────────

  async getAllConfigs() {
    return this.prisma.systemConfig.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  async getConfigsByGroup(group: string) {
    return this.prisma.systemConfig.findMany({ where: { group }, orderBy: { key: 'asc' } });
  }

  async getConfig(key: string) {
    return this.prisma.systemConfig.findUnique({ where: { key } });
  }

  async setConfig(key: string, value: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, label: key },
    });
  }

  async updateConfigs(configs: { key: string; value: string }[]) {
    const results = [];
    for (const c of configs) {
      const result = await this.prisma.systemConfig.update({
        where: { key: c.key },
        data: { value: c.value },
      });
      results.push(result);
    }
    return results;
  }

  // ─── User Preferences ─────────────────────────────────

  async getUserPreferences(userId: number) {
    const prefs = await this.prisma.userPreference.findMany({ where: { userId } });
    const map: Record<string, string> = {};
    for (const p of prefs) map[p.key] = p.value;
    return map;
  }

  async setUserPreference(userId: number, key: string, value: string) {
    return this.prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    });
  }

  async setUserPreferences(userId: number, prefs: Record<string, string>) {
    const results = [];
    for (const [key, value] of Object.entries(prefs)) {
      const r = await this.prisma.userPreference.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
      });
      results.push(r);
    }
    return results;
  }

  // ─── Notification Settings ─────────────────────────────

  async getNotificationSettings(userId: number) {
    const prefs = await this.getUserPreferences(userId);
    return {
      emailNotifications: prefs['notify.email'] !== 'false',
      workflowUpdates: prefs['notify.workflow'] !== 'false',
      committeeAlerts: prefs['notify.committee'] !== 'false',
      deadlineReminders: prefs['notify.deadline'] !== 'false',
      systemAnnouncements: prefs['notify.system'] !== 'false',
    };
  }

  // ─── System Info ───────────────────────────────────────

  async getSystemInfo() {
    const [userCount, workCount, pubCount, libCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.scientificWork.count(),
      this.prisma.publication.count(),
      this.prisma.libraryDocument.count(),
    ]);

    return {
      version: '2.0.0',
      database: 'PostgreSQL 15',
      aiEngine: 'Tesseract OCR + Ollama qwen2.5:3b',
      storage: 'MinIO S3',
      stats: { users: userCount, works: workCount, publications: pubCount, library: libCount },
    };
  }
}
