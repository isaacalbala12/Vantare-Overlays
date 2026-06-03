import type { Meta, StoryObj } from '@storybook/react';
import Standings from './Standings';
import { SeedData } from '../../main/sim/mock-telemetry-seeder';

// ── Wrapper layout ────────────────────────────────────────────────────────
// Standings is a full-height overlay meant to sit on a 1920x1080 canvas.
// The wrapper centers the panel and gives it room to breathe so the table
// renders at a sensible scale in the Storybook iframe.

const meta: Meta<typeof Standings> = {
  title: 'Overlays/Standings',
  component: Standings,
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
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
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

type Story = StoryObj<typeof Standings>;

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

export const playerAtFront: Story = {
  args: {
    telemetry: SeedData.playerAtFront(),
  },
};
