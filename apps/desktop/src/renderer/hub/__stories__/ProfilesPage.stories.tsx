import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ProfilesPage from '../pages/ProfilesPage';
import { useProfileStore } from '../../shared/stores/profile-store';
import { setupMockVantare } from './mock-vantare';

/**
 * Wrapper that resets store and sets flag so the component doesn't re-trigger
 * window.vantare calls on every render.
 */
function ProfilesPageWithData({ profiles }: { profiles: any[] }) {
  useEffect(() => {
    useProfileStore.setState({
      profiles,
      activeProfile: profiles[0] ?? null,
      isLoading: false,
      error: null,
    });
  }, []);

  return <ProfilesPage />;
}

const mockProfiles: any[] = [
  {
    id: 'profile-1',
    name: 'My Racing Profile',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-06-01T08:30:00Z',
    overlays: {
      standings: { overlayId: 'standings', rowCount: 20, showMulticlass: true, showGaps: true, showLastLap: true, showBestLap: true, columns: ['position', 'name', 'gap', 'lastLap'], opacity: 1 },
    },
    themeId: 'dark',
  },
  {
    id: 'profile-2',
    name: 'Streaming Setup',
    createdAt: '2025-03-20T14:00:00Z',
    updatedAt: '2025-05-28T16:00:00Z',
    overlays: {},
    themeId: 'blood',
  },
  {
    id: 'profile-3',
    name: 'Endurance Config',
    createdAt: '2025-04-10T09:00:00Z',
    updatedAt: '2025-05-15T12:00:00Z',
    overlays: {},
    themeId: 'midnight',
  },
];

const meta: Meta<typeof ProfilesPage> = {
  title: 'Hub/ProfilesPage',
  component: ProfilesPage,
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
type Story = StoryObj<typeof ProfilesPage>;

export const WithProfiles: Story = {
  beforeEach: () => {
    setupMockVantare({
      getProfiles: () => Promise.resolve(mockProfiles),
      getActiveProfile: () => Promise.resolve(mockProfiles[0]),
      saveProfile: () => Promise.resolve(),
      deleteProfile: () => Promise.resolve(),
      setActiveProfile: () => Promise.resolve(),
      exportProfile: () => Promise.resolve(JSON.stringify(mockProfiles[0], null, 2)),
      importProfile: (json: string) => Promise.resolve(JSON.parse(json)),
    });
  },
  render: () => <ProfilesPageWithData profiles={mockProfiles} />,
};

export const SingleProfile: Story = {
  beforeEach: () => {
    const single = [mockProfiles[0]];
    setupMockVantare({
      getProfiles: () => Promise.resolve(single),
      getActiveProfile: () => Promise.resolve(single[0]),
      saveProfile: () => Promise.resolve(),
      deleteProfile: () => Promise.resolve(),
      setActiveProfile: () => Promise.resolve(),
      exportProfile: () => Promise.resolve(JSON.stringify(single[0], null, 2)),
    });
  },
  render: () => <ProfilesPageWithData profiles={[mockProfiles[0]]} />,
};
