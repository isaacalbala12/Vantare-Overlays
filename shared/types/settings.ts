export interface Settings {
  // General
  language: string;
  autostart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;

  // Overlay keys
  overlayVisibilityKey: string;

  // Sim
  preferredSim: string;

  // Audio
  alertVolume: number;
  alertEnabled: boolean;

  // Updates
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta';

  // Network
  httpServerPort: number;
  networkAccess: boolean;
}
