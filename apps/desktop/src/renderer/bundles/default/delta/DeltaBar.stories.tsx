import type { Meta, StoryObj } from '@storybook/react';
import DeltaBar from './DeltaBar';
import { deterministicRaceState } from '../../../__fixtures__/mock-telemetry-seeder';

const meta: Meta<typeof DeltaBar> = {
  title: 'Overlays/DeltaBar',
  component: DeltaBar,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof DeltaBar>;

export const FasterThanBest: Story = {
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: { lastLaptime: 81_500, bestLaptime: 82_000 },
    }),
  },
};

export const SlowerThanBest: Story = {
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: { lastLaptime: 82_500, bestLaptime: 82_000 },
    }),
  },
};

export const EmptyState: Story = {
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: { lastLaptime: 82_500, bestLaptime: 0 },
    }),
  },
};

export const SessionStart: Story = {
  args: {
    telemetry: deterministicRaceState({
      playerPosition: 5,
      lap: { lastLaptime: 0, bestLaptime: 82_000 },
    }),
  },
};

export const NullTelemetry: Story = {
  args: {
    telemetry: null,
  },
};
