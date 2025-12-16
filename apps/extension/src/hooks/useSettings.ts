import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '~/types';
import { StorageService } from '~/services/storage.service';
import { DEFAULT_SETTINGS } from '~/types/settings';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loadedSettings = await StorageService.getSettings();
      setSettings(loadedSettings);
      setError(null);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    try {
      await StorageService.saveSettings(newSettings);
      setSettings((prev) => ({ ...prev, ...newSettings }));
      setError(null);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error saving settings:', err);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      await StorageService.resetSettings();
      setSettings(DEFAULT_SETTINGS);
      setError(null);
    } catch (err) {
      setError('Failed to reset settings');
      console.error('Error resetting settings:', err);
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    reloadSettings: loadSettings,
  };
}
