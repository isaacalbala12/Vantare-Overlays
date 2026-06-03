import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import StreamAlerts from '../StreamAlerts';
import { useAlertsStore } from '../../../../shared/stores/alerts-store';
import type { Alert } from '../../../../shared/types/alerts';

vi.mock('@vantare/ui-core', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => (
    <div className="glass-panel">{children}</div>
  ),
}));

function makeAlert(type: 'overtake' | 'pole' | 'fastest_lap' = 'overtake'): Alert {
  return {
    id: `test-${type}-${Date.now()}-${Math.random()}`,
    type,
    timestamp: Date.now(),
    message:
      type === 'overtake'
        ? 'Overtook Driver 5'
        : type === 'pole'
          ? 'Pole position!'
          : 'Fastest lap!',
    data: {},
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StreamAlerts', () => {
  beforeEach(() => {
    useAlertsStore.getState().clearQueue();
    vi.useFakeTimers();
  });

  it('renders nothing when no alert in store', () => {
    const { container } = render(<StreamAlerts />);
    expect(container.firstChild).toBeNull();
  });

  it('renders current alert with hf-fade-in class', () => {
    act(() => useAlertsStore.getState().enqueueAlert(makeAlert('overtake')));
    render(<StreamAlerts />);
    const alert = screen.getByTestId('stream-alert');
    expect(alert.className).toContain('hf-fade-in');
    expect(screen.getByText('Overtook Driver 5')).toBeTruthy();
  });

  it('auto-dismisses after 5 seconds', () => {
    act(() => useAlertsStore.getState().enqueueAlert(makeAlert('overtake')));
    render(<StreamAlerts />);
    expect(screen.getByTestId('stream-alert')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('stream-alert')).toBeNull();
  });

  it('click dismisses alert immediately', () => {
    act(() => useAlertsStore.getState().enqueueAlert(makeAlert('overtake')));
    render(<StreamAlerts />);
    expect(screen.getByTestId('stream-alert')).toBeTruthy();

    fireEvent.click(screen.getByTestId('stream-alert'));
    expect(screen.queryByTestId('stream-alert')).toBeNull();
  });

  it('shows next queued alert after current dismissed', () => {
    act(() => {
      useAlertsStore.getState().enqueueAlert(makeAlert('overtake'));
      useAlertsStore.getState().enqueueAlert(makeAlert('pole'));
    });
    render(<StreamAlerts />);
    expect(screen.getByText('Overtook Driver 5')).toBeTruthy();

    fireEvent.click(screen.getByTestId('stream-alert'));
    expect(screen.getByText('Pole position!')).toBeTruthy();
  });

  it('renders different message per alert type', () => {
    act(() => useAlertsStore.getState().enqueueAlert(makeAlert('fastest_lap')));
    render(<StreamAlerts />);
    expect(screen.getByText('Fastest lap!')).toBeTruthy();
  });
});
