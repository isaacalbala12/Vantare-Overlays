import { create } from 'zustand';
import type { Settings } from '@vantare/types';

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      const settings = await window.vantare.getSettings();
      set({ settings, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      set({ error: message, isLoading: false });
    }
  },

  saveSettings: async (partial) => {
    try {
      set({ error: null });
      await window.vantare.saveSettings(partial);
      set({ settings: { ...get().settings!, ...partial } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      set({ error: message });
    }
  },
}));
