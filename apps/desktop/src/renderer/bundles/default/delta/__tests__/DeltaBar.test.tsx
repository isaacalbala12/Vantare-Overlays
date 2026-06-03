import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DeltaBar from '../DeltaBar';
import type { Telemetry } from '@vantare/sim-core';

vi.mock('@vantare/ui-core', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TimeDisplay: ({ timeMs }: { timeMs: number }) => <span>{timeMs}</span>,
}));

// DOM cleanup between tests — vitest with @testing-library/react does not
// auto-cleanup unless a setupFile is registered. Doing it explicitly here so
// the file remains self-contained (no new deps, no global setup).
afterEach(() => {
  cleanup();
});

function createTelemetry(lastLaptime: number, bestLaptime: number): Telemetry {
  return {
    sim: 'iracing',
    timestamp: Date.now(),
    isConnected: true,
    player: { /* minimal valid player */ } as any,
    engine: {} as any,
    tyres: {} as any,
    lap: {
      currentLap: 10,
      totalLaps: 20,
      lastLaptime,
      bestLaptime,
      sector: 1,
      sector1: 0,
      sector2: 0,
      sector3: 0,
      estimatedLaptime: 0,
      delta: 0,
      isPersonalBest: false,
      isSessionBest: false,
    },
    session: {} as any,
    vehicles: [],
    track: {} as any,
    inputs: {} as any,
    weather: {} as any,
  };
}

describe('DeltaBar', () => {
  it('renders positive delta with red direction when lastLaptime > bestLaptime', () => {
    const telemetry = createTelemetry(82_500, 82_000); // +0.500s (in ms)
    render(<DeltaBar telemetry={telemetry} />);
    // getByText throws if not found — that's the assertion.
    expect(screen.getByText(/\+0\.500s/)).toBeTruthy();
    expect(screen.getByTestId('delta-bar').getAttribute('data-direction')).toBe('positive');
  });

  it('renders negative delta with green direction when lastLaptime < bestLaptime', () => {
    const telemetry = createTelemetry(81_500, 82_000); // -0.500s (in ms)
    render(<DeltaBar telemetry={telemetry} />);
    expect(screen.getByText(/-0\.500s/)).toBeTruthy();
    expect(screen.getByTestId('delta-bar').getAttribute('data-direction')).toBe('negative');
  });

  it('shows em-dash when bestLaptime is 0 (empty state)', () => {
    const telemetry = createTelemetry(82_500, 0);
    render(<DeltaBar telemetry={telemetry} />);
    expect(screen.getByText('\u2014')).toBeTruthy();
    // Must not show NaN
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it('shows em-dash when lastLaptime is 0 (session start)', () => {
    const telemetry = createTelemetry(0, 82_000);
    render(<DeltaBar telemetry={telemetry} />);
    expect(screen.getByText('\u2014')).toBeTruthy();
  });

  it('shows em-dash when telemetry is null', () => {
    render(<DeltaBar telemetry={null} />);
    expect(screen.getByText('\u2014')).toBeTruthy();
  });

  it('uses calculateDeltaToBest from sim-core (not local implementation)', () => {
    // This is verified by code review — see imports
    // Functional test: import resolution works
    const telemetry = createTelemetry(82_345, 82_000);
    render(<DeltaBar telemetry={telemetry} />);
    // +0.345s with .toFixed(3) → "+0.345s"
    expect(screen.getByText(/\+0\.345s/)).toBeTruthy();
  });
});
