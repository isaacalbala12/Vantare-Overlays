import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Settings } from '@vantare/types';
import type { Profile } from '@vantare/types';

const mockSettings: Settings = {
  language: 'en',
  autostart: false,
  minimizeToTray: true,
  startMinimized: false,
  overlayVisibilityKey: 'ctrl+shift+v',
  preferredSim: 'iRacing',
  alertVolume: 0.8,
  alertEnabled: true,
  autoUpdate: true,
  updateChannel: 'stable',
  httpServerPort: 7472,
  networkAccess: false,
};

const mockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'profile-1',
  name: 'Profile 1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  overlays: {},
  themeId: 'theme-1',
  ...overrides,
});

function createBridgeMock() {
  const profiles: Profile[] = [mockProfile()];

  return {
    getSettings: vi.fn().mockResolvedValue(mockSettings),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProfiles: vi.fn().mockResolvedValue(profiles),
    getActiveProfile: vi.fn().mockResolvedValue(profiles[0]),
    saveProfile: vi.fn().mockImplementation(async (profile: Profile) => {
      const index = profiles.findIndex((p) => p.id === profile.id);
      if (index >= 0) {
        profiles[index] = profile;
      } else {
        profiles.push(profile);
      }
    }),
    deleteProfile: vi.fn().mockImplementation(async (id: string) => {
      const index = profiles.findIndex((p) => p.id === id);
      if (index >= 0) {
        profiles.splice(index, 1);
      }
    }),
    setActiveProfile: vi.fn().mockImplementation(async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) {
        throw new Error('Profile not found');
      }
    }),
    importProfile: vi.fn().mockImplementation(async (data: string) => {
      const profile = mockProfile({ id: 'imported-profile' });
      profiles.push(profile);
      return profile;
    }),
    exportProfile: vi.fn().mockResolvedValue('{"id":"profile-1"}'),
  };
}

beforeEach(() => {
  (window as Window & { vantare: unknown }).vantare = createBridgeMock();
});

describe('settings-store', () => {
  it('loadSettings populates settings from mocked IPC', async () => {
    const { useSettingsStore } = await import('../stores/settings-store');
    await useSettingsStore.getState().loadSettings();
    expect((window.vantare as { getSettings: () => Promise<Settings> }).getSettings).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().settings).toEqual(mockSettings);
    expect(useSettingsStore.getState().isLoading).toBe(false);
    expect(useSettingsStore.getState().error).toBeNull();
  });
});

describe('profile-store', () => {
  it('load profiles', async () => {
    const { useProfileStore } = await import('../stores/profile-store');
    await useProfileStore.getState().loadProfiles();
    expect(useProfileStore.getState().profiles.length).toBeGreaterThan(0);
  });

  it('create and delete profile', async () => {
    const { useProfileStore } = await import('../stores/profile-store');
    await useProfileStore.getState().createProfile('New profile');
    expect((window.vantare as { saveProfile: (profile: Profile) => Promise<void> }).saveProfile).toHaveBeenCalled();

    await useProfileStore.getState().deleteProfile('profile-1');
    expect((window.vantare as { deleteProfile: (id: string) => Promise<void> }).deleteProfile).toHaveBeenCalledWith('profile-1');
  });
});

describe('overlay-config-store', () => {
  const overlayId = 'standings';

  const standingsOverlay = {
    overlayId: 'standings' as const,
    rowCount: 20,
    showMulticlass: true,
    showGaps: true,
    showLastLap: true,
    showBestLap: true,
    columns: ['position', 'name', 'gap', 'lastLap'],
    opacity: 0.9,
  };

  it('load overlay config', async () => {
    const { useOverlayConfigStore } = await import('../stores/overlay-config-store');
    (window.vantare as { getActiveProfile: () => Promise<Profile | null> }).getActiveProfile = async () =>
      mockProfile({
        overlays: {
          [overlayId]: standingsOverlay,
        },
      });

    await useOverlayConfigStore.getState().loadOverlayConfig(overlayId);
    expect(useOverlayConfigStore.getState().draftConfigs[overlayId]).toEqual({
      rowCount: 20,
      showMulticlass: true,
      showGaps: true,
      showLastLap: true,
      showBestLap: true,
      columns: ['position', 'name', 'gap', 'lastLap'],
      opacity: 0.9,
    });
  });

  it('save overlay config', async () => {
    const { useOverlayConfigStore } = await import('../stores/overlay-config-store');
    useOverlayConfigStore.getState().updateOverlayConfig(overlayId, { opacity: 0.5 });
    await useOverlayConfigStore.getState().saveOverlayConfig(overlayId);
    expect((window.vantare as { saveProfile: (profile: Profile) => Promise<void> }).saveProfile).toHaveBeenCalled();
    expect(useOverlayConfigStore.getState().saving).toBe(false);
  });

  it('discard changes reverts draft', async () => {
    const { useOverlayConfigStore } = await import('../stores/overlay-config-store');
    (window.vantare as { getActiveProfile: () => Promise<Profile | null> }).getActiveProfile = async () =>
      mockProfile({
        overlays: {
          [overlayId]: {
            ...standingsOverlay,
            opacity: 1,
          },
        },
      });

    useOverlayConfigStore.getState().updateOverlayConfig(overlayId, { opacity: 0.2 });
    await useOverlayConfigStore.getState().discardChanges(overlayId);
    expect(useOverlayConfigStore.getState().draftConfigs[overlayId]).toEqual({
      rowCount: 20,
      showMulticlass: true,
      showGaps: true,
      showLastLap: true,
      showBestLap: true,
      columns: ['position', 'name', 'gap', 'lastLap'],
      opacity: 1,
    });
  });
});
