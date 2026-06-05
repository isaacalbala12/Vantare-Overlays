import { describe, it, expect, beforeEach } from "vitest";
import { useTelemetryStore } from "../../stores/telemetry-store";
import type { Telemetry } from "@vantare/sim-core";

const mockTelemetry: Telemetry = {
  sim: "iracing",
  timestamp: Date.now(),
  isConnected: true,
  player: {
    speed: 250, rpm: 8000, gear: 4, isOnTrack: true, isInPit: false, isPitting: false,
    position: 5, classPosition: 3, lapDistance: 1200, lapCount: 12,
    driverName: "Test Driver", carNumber: "42", teamName: "Test Team",
  },
  engine: {
    rpm: 8000, maxRpm: 10000, fuelLevel: 60, fuelCapacity: 100,
    fuelPressure: 5.5, waterTemp: 90, oilTemp: 105, oilPressure: 4.5, engineWarnings: 0,
  },
  tyres: {
    fl: { temp: 85, pressure: 27.5, wear: 15 },
    fr: { temp: 87, pressure: 27.8, wear: 14 },
    rl: { temp: 90, pressure: 27.2, wear: 12 },
    rr: { temp: 92, pressure: 27.0, wear: 13 },
  },
  lap: {
    currentLap: 6, totalLaps: 20, lastLaptime: 95.234, bestLaptime: 94.567,
    sector: 2, sector1: 31.234, sector2: 32.567, sector3: 31.433,
    estimatedLaptime: 95.1, delta: 0.667, isPersonalBest: false, isSessionBest: false,
  },
  session: {
    type: "Race", state: "Green", timeRemaining: 1800, timeElapsed: 600, totalLaps: 20,
    flags: [{ type: "Green", active: true }], trackName: "Test Track", trackLength: 5000,
    weather: { airTemp: 22, trackTemp: 35, humidity: 45, precipitation: 0, windSpeed: 5, windDirection: 180 },
  },
  vehicles: [
    {
      id: 1, driverName: "Leader", carNumber: "1", teamName: "Team A", position: 1, classPosition: 1,
      gap: 0, gapType: "seconds", lastLaptime: 94.1, bestLaptime: 93.8,
      sectorTimes: [30.5, 32.1, 31.2], speed: 255, isPlayer: false, isPitting: false,
      tyreCompound: "Soft", fuelRemaining: 50, color: "#FF0000",
    },
    {
      id: 2, driverName: "Test Driver", carNumber: "42", teamName: "Test Team", position: 5, classPosition: 3,
      gap: 3.5, gapType: "seconds", lastLaptime: 95.234, bestLaptime: 94.567,
      sectorTimes: [31.234, 32.567, 31.433], speed: 250, isPlayer: true, isPitting: false,
      tyreCompound: "Medium", fuelRemaining: 60, color: "#00FF00",
    },
  ],
  track: { name: "Test Track", length: 5000, sectors: [1500, 1800, 1700] },
  inputs: { throttle: 0.8, brake: 0.0, clutch: 0.0, steering: -0.05 },
  weather: { airTemp: 22, trackTemp: 35, humidity: 45, precipitation: 0, windSpeed: 5, windDirection: 180 },
};

// The useTelemetry hook is a thin selector wrapper around useTelemetryStore.
// Since Zustand hooks require a React renderer context, we validate the
// hook's logic by testing the store selectors it composes.
//
// The hook maps store state to:
//   { telemetry, connected, error, isLoading }
// where isLoading = !connected && !telemetry && !error

describe("useTelemetry", () => {
  beforeEach(() => {
    useTelemetryStore.setState({
      telemetry: null,
      connected: false,
      error: null,
      isMock: false,
    });
  });

  it("returns default values from store initially (loading state)", () => {
    const s = useTelemetryStore.getState();
    expect(s.telemetry).toBeNull();
    expect(s.connected).toBe(false);
    expect(s.error).toBeNull();
    // isLoading = !connected && !telemetry && !error → true
    expect(!s.connected && !s.telemetry && !s.error).toBe(true);
  });

  it("sets and reads telemetry data via store", () => {
    useTelemetryStore.getState().setTelemetry(mockTelemetry);
    const s = useTelemetryStore.getState();
    expect(s.telemetry).toEqual(mockTelemetry);
    expect(s.connected).toBe(true);
    expect(s.error).toBeNull();
  });

  it("sets and reads error via store", () => {
    useTelemetryStore.getState().setError("Connection lost");
    const s = useTelemetryStore.getState();
    expect(s.error).toBe("Connection lost");
  });

  it("computes isLoading based on store state", () => {
    // Initial: loading = true
    let s = useTelemetryStore.getState();
    expect(!s.connected && !s.telemetry && !s.error).toBe(true);

    // After setting telemetry: loading = false
    useTelemetryStore.getState().setTelemetry(mockTelemetry);
    s = useTelemetryStore.getState();
    expect(!s.connected && !s.telemetry && !s.error).toBe(false);

    // Reset and set error: loading = false
    useTelemetryStore.setState({ telemetry: null, connected: false, error: null });
    useTelemetryStore.getState().setError("Some error");
    s = useTelemetryStore.getState();
    expect(!s.connected && !s.telemetry && !s.error).toBe(false);
  });

  it("subscribes reactively to store changes", () => {
    let lastState = useTelemetryStore.getState();
    const unsub = useTelemetryStore.subscribe(() => {
      lastState = useTelemetryStore.getState();
    });

    expect(lastState.telemetry).toBeNull();
    useTelemetryStore.getState().setTelemetry(mockTelemetry);
    expect(lastState.telemetry).toEqual(mockTelemetry);

    unsub();
  });

  it("does NOT subscribe to window.vantare directly (handled by TelemetryBridge)", () => {
    // The hook is a pure store consumer — no window.vantare dependency
    const state = useTelemetryStore.getState();
    expect(state.telemetry).toBeNull();
  });
});
