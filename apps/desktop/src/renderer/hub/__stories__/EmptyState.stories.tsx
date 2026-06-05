import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HubLayout from '../HubLayout';
import { useProfileStore } from '../../shared/stores/profile-store';
import { setupMockVantare } from './mock-vantare';

const meta: Meta<typeof HubLayout> = {
  title: 'Hub/EmptyState',
  component: HubLayout,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Story />}>
            <Route index element={null} />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof HubLayout>;

/**
 * Renders HubLayout with no active profile, triggering the inline
 * EmptyState component ("No Profile Selected").
 */
export const NoProfile: Story = {
  beforeEach: () => {
    setupMockVantare();
    useProfileStore.setState({
      profiles: [],
      activeProfile: null,
      isLoading: false,
      error: null,
    });
  },
};
