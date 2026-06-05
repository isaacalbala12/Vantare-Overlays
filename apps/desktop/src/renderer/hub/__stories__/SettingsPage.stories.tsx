import type { Meta, StoryObj } from '@storybook/react';
import SettingsPage from '../pages/SettingsPage';
import { useSettingsStore } from '../../shared/stores/settings-store';
import { setupMockVantare } from './mock-vantare';

const meta: Meta<typeof SettingsPage> = {
  title: 'Hub/SettingsPage',
  component: SettingsPage,
  decorators: [
    (Story) => (
      <div className="bg-[#0a0a0a] min-h-screen">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  beforeEach: () => {
    setupMockVantare({
      getSettings: () =>
        Promise.resolve({
          language: 'en',
          autostart: false,
          minimizeToTray: true,
          startMinimized: false,
          overlayVisibilityKey: 'F9',
          preferredSim: 'auto',
          alertVolume: 0.8,
          alertEnabled: true,
          autoUpdate: true,
          updateChannel: 'stable',
          httpServerPort: 2546,
          networkAccess: true,
        }),
      saveSettings: () => Promise.resolve(),
    });
    useSettingsStore.setState({
      settings: {
        language: 'en',
        autostart: false,
        minimizeToTray: true,
        startMinimized: false,
        overlayVisibilityKey: 'F9',
        preferredSim: 'auto',
        alertVolume: 0.8,
        alertEnabled: true,
        autoUpdate: true,
        updateChannel: 'stable',
        httpServerPort: 2546,
        networkAccess: true,
      },
      isLoading: false,
      error: null,
    });
  },
};

export const Loading: Story = {
  beforeEach: () => {
    setupMockVantare();
    useSettingsStore.setState({
      settings: null,
      isLoading: true,
      error: null,
    });
  },
};
