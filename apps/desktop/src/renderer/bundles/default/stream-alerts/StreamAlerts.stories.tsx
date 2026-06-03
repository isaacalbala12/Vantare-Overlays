import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import StreamAlerts from './StreamAlerts';
import { useAlertsStore } from '../../../shared/stores/alerts-store';
import type { Alert } from '../../../shared/types/alerts';

const meta: Meta<typeof StreamAlerts> = {
  title: 'Overlays/StreamAlerts',
  component: StreamAlerts,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof StreamAlerts>;

function withAlert(type: 'overtake' | 'pole' | 'fastest_lap') {
  function AlertWrapper() {
    useEffect(() => {
      const store = useAlertsStore.getState();
      store.clearQueue();
      const alert: Alert = {
        id: `story-${type}`,
        type,
        timestamp: Date.now(),
        message:
          type === 'overtake' ? 'Overtook Driver 5'
          : type === 'pole' ? 'Pole position!'
          : 'Fastest lap!',
        data: {},
      };
      store.enqueueAlert(alert);
    }, []);
    return <StreamAlerts />;
  }
  return AlertWrapper;
}

export const Overtake: Story = {
  render: () => withAlert('overtake')(),
};

export const Pole: Story = {
  render: () => withAlert('pole')(),
};

export const FastestLap: Story = {
  render: () => withAlert('fastest_lap')(),
};

export const Empty: Story = {
  render: () => <StreamAlerts />,
};
