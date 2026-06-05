import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SettingsForm } from '../SettingsForm';
import { StandingsConfigSchema } from '../../schemas/overlay-config';

const meta: Meta<typeof SettingsForm> = {
  title: 'UI-Core/SettingsForm',
  component: SettingsForm,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 24,
          minHeight: '100vh',
          background: '#0a0a0a',
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof SettingsForm>;

export const StandingsConfig: Story = {
  render: () => {
    const [values, setValues] = useState<Record<string, unknown>>({
      rowCount: 20,
      showMulticlass: true,
      showGaps: true,
      showLastLap: true,
      showBestLap: true,
      columns: ['position', 'name', 'gap', 'lastLap'],
      opacity: 1,
    });

    return (
      <SettingsForm
        schema={StandingsConfigSchema as any}
        values={values}
        onChange={(partial) => setValues((prev) => ({ ...prev, ...partial }))}
        testId="standings"
      />
    );
  },
};
