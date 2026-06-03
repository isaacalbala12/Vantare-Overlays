import type { Meta, StoryObj } from '@storybook/react';
import Relative from './Relative';
import { SeedData } from '../../../__fixtures__/mock-telemetry-seeder';

// ── Wrapper layout ────────────────────────────────────────────────────────
// Relative is a compact 7-row overlay. The wrapper gives it room to show
// all rows with the player in the center, against a dark background that
// matches the streaming context where the overlay normally appears.

const meta: Meta<typeof Relative> = {
  title: 'Overlays/Relative',
  component: Relative,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 24,
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #1a0a14 50%, #0a0a0f 100%)',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof Relative>;

// ── Stories ───────────────────────────────────────────────────────────────

export const defaultStory: Story = {
  name: 'default',
  args: {
    telemetry: SeedData.midRaceState(),
  },
};

export const empty: Story = {
  args: {
    telemetry: SeedData.emptyState(),
  },
};

export const leading: Story = {
  args: {
    telemetry: SeedData.playerAtFront(),
  },
};
