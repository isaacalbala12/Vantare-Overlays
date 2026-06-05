import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import OverlaySettingsPage from '../pages/OverlaySettingsPage';
import { useProfileStore } from '../../shared/stores/profile-store';
import { useOverlayConfigStore } from '../../shared/stores/overlay-config-store';
import { setupMockVantare } from './mock-vantare';

/**
 * Wrapper that pre-seeds draft config and profile at mount time.
 */
function OverlaySettingsPageWrapper() {
  useEffect(() => {
    useOverlayConfigStore.setState({
      draftConfigs: {
        standings: {
          rowCount: 20,
          showMulticlass: true,
          showGaps: true,
          showLastLap: true,
          showBestLap: true,
          columns: ['position', 'name', 'gap', 'lastLap'],
          opacity: 1,
        },
        relative: {
          rangeAhead: 3,
          rangeBehind: 3,
          showGaps: true,
          colorCoding: true,
          opacity: 1,
        },
        delta: {
          opacity: 1,
        },
        'stream-alerts': {
          opacity: 1,
        },
      },
      saving: false,
      error: null,
    });
  }, []);

  return <OverlaySettingsPage />;
}

const meta: Meta<typeof OverlaySettingsPage> = {
  title: 'Hub/OverlaySettingsPage',
  component: OverlaySettingsPage,
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
type Story = StoryObj<typeof OverlaySettingsPage>;

export const StandingsTab: Story = {
  beforeEach: () => {
    setupMockVantare({
      getActiveProfile: () =>
        Promise.resolve({
          id: 'profile-1',
          name: 'My Racing Profile',
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-06-01T08:30:00Z',
          overlays: {
            standings: {
              overlayId: 'standings',
              rowCount: 20,
              showMulticlass: true,
              showGaps: true,
              showLastLap: true,
              showBestLap: true,
              columns: ['position', 'name', 'gap', 'lastLap'],
              opacity: 1,
            },
          },
          themeId: 'dark',
        }),
      saveProfile: () => Promise.resolve(),
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          standings: {
            overlayId: 'standings',
            rowCount: 20,
            showMulticlass: true,
            showGaps: true,
            showLastLap: true,
            showBestLap: true,
            columns: ['position', 'name', 'gap', 'lastLap'],
            opacity: 1,
          },
        },
        themeId: 'dark',
      },
    });
  },
  render: () => <OverlaySettingsPageWrapper />,
};

export const RelativeTab: Story = {
  ...StandingsTab,
  beforeEach: () => {
    setupMockVantare({
      getActiveProfile: () =>
        Promise.resolve({
          id: 'profile-1',
          name: 'My Racing Profile',
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-06-01T08:30:00Z',
          overlays: {
            relative: {
              overlayId: 'relative',
              rangeAhead: 3,
              rangeBehind: 3,
              showGaps: true,
              colorCoding: true,
              opacity: 0.9,
            },
          },
          themeId: 'dark',
        }),
      saveProfile: () => Promise.resolve(),
    });
    useProfileStore.setState({
      activeProfile: {
        id: 'profile-1',
        name: 'My Racing Profile',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {
          relative: {
            overlayId: 'relative',
            rangeAhead: 3,
            rangeBehind: 3,
            showGaps: true,
            colorCoding: true,
            opacity: 0.9,
          },
        },
        themeId: 'dark',
      },
    });
    useOverlayConfigStore.setState({
      draftConfigs: {
        relative: {
          rangeAhead: 3,
          rangeBehind: 3,
          showGaps: true,
          colorCoding: true,
          opacity: 0.9,
        },
      },
      saving: false,
      error: null,
    });
  },
  render: () => <OverlaySettingsPageWrapper />,
};
