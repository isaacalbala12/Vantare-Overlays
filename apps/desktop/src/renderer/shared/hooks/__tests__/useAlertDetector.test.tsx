// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertDetector } from '../useAlertDetector';
import { useAlertsStore } from '../../stores/alerts-store';
import { deterministicRaceState } from '../../../__fixtures__/mock-telemetry-seeder';
import { createTelemetryStore } from '@vantare/ui-core';

describe('useAlertDetector', () => {
  beforeEach(() => {
    useAlertsStore.getState().clearQueue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects overtake when player position decreases (player moves up)', () => {
    const store = createTelemetryStore();
    const { rerender } = renderHook(
      ({ t }) => useAlertDetector(t),
      { initialProps: { t: store.getState().telemetry } },
    );

    // Position 5 — first render records state only
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 5, lap: { isSessionBest: false } }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    // Position 3 — overtake detected
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 3, lap: { isSessionBest: false } }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    const state = useAlertsStore.getState();
    // First alert lands in currentAlert (state machine: idle → showing)
    const allAlerts = state.currentAlert
      ? [state.currentAlert, ...state.queue]
      : state.queue;
    expect(allAlerts.some((a) => a.type === 'overtake')).toBe(true);
  });

  it('detects pole when session is Qualifying and player reaches P1', () => {
    const store = createTelemetryStore();
    const { rerender } = renderHook(
      ({ t }) => useAlertDetector(t),
      { initialProps: { t: store.getState().telemetry } },
    );

    // Position 2 (qualifying) — first render records state only
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 2, sessionType: 'Qualifying' }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    // Position 1 (qualifying) — overtake first, then pole
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 1, sessionType: 'Qualifying' }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    const state = useAlertsStore.getState();
    const allAlerts = state.currentAlert
      ? [state.currentAlert, ...state.queue]
      : state.queue;
    expect(allAlerts.some((a) => a.type === 'pole')).toBe(true);
  });

  it('detects fastest lap when lap.isSessionBest becomes true', () => {
    const store = createTelemetryStore();
    const { rerender } = renderHook(
      ({ t }) => useAlertDetector(t),
      { initialProps: { t: store.getState().telemetry } },
    );

    // isSessionBest: false — first render records state only
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 5, lap: { isSessionBest: false } }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    // isSessionBest: true — fastest lap detected
    act(() => {
      store.getState().setTelemetry(
        deterministicRaceState({ playerPosition: 5, lap: { isSessionBest: true } }),
      );
    });
    rerender({ t: store.getState().telemetry });
    vi.advanceTimersByTime(62.5);

    const state = useAlertsStore.getState();
    const allAlerts = state.currentAlert
      ? [state.currentAlert, ...state.queue]
      : state.queue;
    expect(allAlerts.some((a) => a.type === 'fastest_lap')).toBe(true);
  });

  it('caps queue at 5 alerts (drops oldest on 6th)', () => {
    // Pre-populate currentAlert so all enqueues go to the queue
    act(() => {
      useAlertsStore.setState({
        currentAlert: {
          id: 'pre',
          type: 'overtake',
          timestamp: 0,
          message: 'pre',
          data: {},
        },
        queue: [],
      });
    });

    for (let i = 0; i < 6; i++) {
      act(() => {
        useAlertsStore.getState().enqueueAlert({
          id: `test-${i}`,
          type: 'overtake',
          timestamp: i,
          message: `Test ${i}`,
          data: {},
        });
      });
    }

    const { queue } = useAlertsStore.getState();
    expect(queue).toHaveLength(5);
    // test-0 was the oldest, dropped to make room
    expect(queue[0].id).toBe('test-1');
    expect(queue[4].id).toBe('test-5');
  });

  it('drains queue on telemetry disconnect via clearQueue', () => {
    const { enqueueAlert, clearQueue } = useAlertsStore.getState();
    act(() => {
      enqueueAlert({ id: 't1', type: 'overtake', timestamp: 1, message: '', data: {} });
      enqueueAlert({ id: 't2', type: 'pole', timestamp: 2, message: '', data: {} });
    });

    // First goes to currentAlert, second to queue
    expect(useAlertsStore.getState().currentAlert?.id).toBe('t1');
    expect(useAlertsStore.getState().queue).toHaveLength(1);

    act(() => {
      clearQueue();
    });
    expect(useAlertsStore.getState().currentAlert).toBeNull();
    expect(useAlertsStore.getState().queue).toHaveLength(0);
  });
});
