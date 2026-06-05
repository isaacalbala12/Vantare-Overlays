import type Store from 'electron-store';
import type { LicenseCache } from '@vantare/auth/types';
import type { Profile, Settings, Theme } from '@shared/types';

export interface AppStoreSchema {
  settings: Settings;
  overlays: Record<string, unknown>;
  profiles: Profile[];
  activeProfileId: string | null;
  themes: Theme[];
  activeThemeId: string;
  licenseCache: LicenseCache | null;
}

const defaults: AppStoreSchema = {
  settings: {
    language: 'en',
    autostart: false,
    minimizeToTray: true,
    startMinimized: false,
    overlayVisibilityKey: 'Alt+H',
    preferredSim: 'auto',
    alertVolume: 0.8,
    alertEnabled: true,
    autoUpdate: true,
    updateChannel: 'stable',
    httpServerPort: 3200,
    networkAccess: false,
  },
  overlays: {},
  profiles: [],
  activeProfileId: null,
  themes: [],
  activeThemeId: 'dark',
  licenseCache: null,
};

let store: Store<AppStoreSchema> | null = null;

export async function initAppStore(): Promise<void> {
  if (store) return;
  const { default: ElectronStore } = await import('electron-store');
  store = new ElectronStore<AppStoreSchema>({ defaults });
}

export function getStore(): Store<AppStoreSchema> {
  if (!store) {
    throw new Error('App store not initialized. Call initAppStore() before using the store.');
  }
  return store;
}

/** Deterministic store state for Playwright Electron smoke tests. */
export function seedE2eDefaults(): void {
  if (process.env.E2E_TEST !== '1') return;

  const s = getStore();
  const now = new Date().toISOString();
  const profile: Profile = {
    id: 'e2e-default',
    name: 'E2E Default',
    createdAt: now,
    updatedAt: now,
    overlays: {},
    themeId: 'dark',
  };

  s.set('profiles', [profile]);
  s.set('activeProfileId', profile.id);
}
