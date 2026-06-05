import { create } from 'zustand';

interface OverlayConfigState {
  draftConfigs: Record<string, Record<string, unknown>>;
  saving: boolean;
  error: string | null;
  loadOverlayConfig: (overlayId: string) => Promise<void>;
  updateOverlayConfig: (overlayId: string, partial: Record<string, unknown>) => void;
  saveOverlayConfig: (overlayId: string) => Promise<void>;
  discardChanges: (overlayId: string) => Promise<void>;
}

export const useOverlayConfigStore = create<OverlayConfigState>((set, get) => ({
  draftConfigs: {},
  saving: false,
  error: null,

  loadOverlayConfig: async (overlayId) => {
    try {
      set({ error: null });
      const activeProfile = await window.vantare.getActiveProfile();
      const overlay = activeProfile?.overlays?.[overlayId] as Record<string, unknown> | undefined;
      const settings: Record<string, unknown> = {};
      if (overlay) {
        for (const [key, val] of Object.entries(overlay)) {
          if (key !== 'overlayId') {
            settings[key] = val;
          }
        }
      }
      set((state) => ({
        draftConfigs: { ...state.draftConfigs, [overlayId]: settings },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load overlay config';
      set({ error: message });
    }
  },

  updateOverlayConfig: (overlayId, partial) => {
    set((state) => ({
      draftConfigs: {
        ...state.draftConfigs,
        [overlayId]: { ...state.draftConfigs[overlayId], ...partial },
      },
    }));
  },

  saveOverlayConfig: async (overlayId) => {
    try {
      set({ saving: true, error: null });
      const draft = get().draftConfigs[overlayId];
      const activeProfile = await window.vantare.getActiveProfile();

      if (!activeProfile) {
        throw new Error('No active profile');
      }

      const updatedOverlay = { ...activeProfile.overlays[overlayId], ...draft } as Record<string, unknown>;

      const updatedProfile = {
        id: activeProfile.id,
        name: activeProfile.name,
        createdAt: activeProfile.createdAt,
        updatedAt: new Date().toISOString(),
        overlays: {
          ...activeProfile.overlays,
          [overlayId]: updatedOverlay,
        },
        themeId: activeProfile.themeId,
      };

      await window.vantare.saveProfile(updatedProfile as any);
      set({ saving: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save overlay config';
      set({ error: message, saving: false });
    }
  },

  discardChanges: async (overlayId) => {
    try {
      set({ error: null });
      const activeProfile = await window.vantare.getActiveProfile();
      const overlay = activeProfile?.overlays?.[overlayId] as Record<string, unknown> | undefined;
      const settings: Record<string, unknown> = {};
      if (overlay) {
        for (const [key, val] of Object.entries(overlay)) {
          if (key !== 'overlayId') {
            settings[key] = val;
          }
        }
      }
      set((state) => ({
        draftConfigs: { ...state.draftConfigs, [overlayId]: settings },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discard changes';
      set({ error: message });
    }
  },
}));
