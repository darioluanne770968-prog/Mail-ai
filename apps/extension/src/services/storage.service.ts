import { Storage } from '@plasmohq/storage';
import { type UserSettings, DEFAULT_SETTINGS } from '~/types';

const storage = new Storage();
const SETTINGS_KEY = 'mail-ai-settings';
const API_KEY_KEY = 'mail-ai-api-key';
const USAGE_KEY = 'mail-ai-usage';

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  lastResetDate: string;
  dailyRequests: number;
}

export const StorageService = {
  // Settings
  async getSettings(): Promise<UserSettings> {
    const settings = await storage.get<UserSettings>(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    await storage.set(SETTINGS_KEY, { ...current, ...settings });
  },

  async resetSettings(): Promise<void> {
    await storage.set(SETTINGS_KEY, DEFAULT_SETTINGS);
  },

  // API Key (stored securely)
  async getApiKey(): Promise<string | null> {
    return storage.get<string>(API_KEY_KEY);
  },

  async saveApiKey(apiKey: string): Promise<void> {
    await storage.set(API_KEY_KEY, apiKey);
  },

  async removeApiKey(): Promise<void> {
    await storage.remove(API_KEY_KEY);
  },

  // Usage Statistics
  async getUsageStats(): Promise<UsageStats> {
    const stats = await storage.get<UsageStats>(USAGE_KEY);
    const today = new Date().toISOString().split('T')[0];

    if (!stats) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        lastResetDate: today,
        dailyRequests: 0,
      };
    }

    // Reset daily counter if it's a new day
    if (stats.lastResetDate !== today) {
      stats.dailyRequests = 0;
      stats.lastResetDate = today;
      await storage.set(USAGE_KEY, stats);
    }

    return stats;
  },

  async incrementUsage(tokens: number): Promise<void> {
    const stats = await this.getUsageStats();
    stats.totalRequests += 1;
    stats.totalTokens += tokens;
    stats.dailyRequests += 1;
    await storage.set(USAGE_KEY, stats);
  },

  // History
  async getHistory<T>(key: string): Promise<T[]> {
    return (await storage.get<T[]>(key)) || [];
  },

  async addToHistory<T>(key: string, item: T, maxItems = 100): Promise<void> {
    const history = await this.getHistory<T>(key);
    history.unshift(item);
    if (history.length > maxItems) {
      history.pop();
    }
    await storage.set(key, history);
  },

  async clearHistory(key: string): Promise<void> {
    await storage.remove(key);
  },
};
