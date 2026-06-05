import { describe, it, expect, beforeEach } from "vitest";
import {
  createTelemetryStore,
  useTelemetryStore,
  selectPlayer,
  selectEngine,
  selectTyres,
  selectLap,
  selectSession,
  selectVehicles,
  selectTrack,
  selectInputs,
  selectWeather,
  selectConnected,
  selectIsMock,
  selectFuelCalculations,
  selectGapCalculations,
  selectDeltaCalculations,
} from "../telemetry-store";
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
    {
      id: 3, driverName: "Car Ahead", carNumber: "5", teamName: "Team C", position: 4, classPosition: 2,
      gap: 1.8, gapType: "seconds", lastLaptime: 94.9, bestLaptime: 94.2,
      sectorTimes: [30.8, 32.3, 31.1], speed: 252, isPlayer: false, isPitting: false,
      tyreCompound: "Soft", fuelRemaining: 48, color: "#0000FF",
    },
  ],
  track: { name: "Test Track", length: 5000, sectors: [1500, 1800, 1700] },
  inputs: { throttle: 0.8, brake: 0.0, clutch: 0.0, steering: -0.05 },
  weather: { airTemp: 22, trackTemp: 35, humidity: 45, precipitation: 0, windSpeed: 5, windDirection: 180 },
};

describe("createTelemetryStore", () => {
  it("creates a store with correct initial state", () => {
    const store = createTelemetryStore();
    const state = store.getState();
    expect(state.telemetry).toBeNull();
    expect(state.connected).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isMock).toBe(false);
  });

  it("setTelemetry updates telemetry and sets connected to true", () => {
    const store = createTelemetryStore();
    store.getState().setTelemetry(mockTelemetry);
    const state = store.getState();
    expect(state.telemetry).toEqual(mockTelemetry);
    expect(state.connected).toBe(true);
  });

  it("creates independent instances for test isolation", () => {
    const storeA = createTelemetryStore();
    const storeB = createTelemetryStore();
    storeA.getState().setTelemetry(mockTelemetry);
    expect(storeB.getState().telemetry).toBeNull();
    expect(storeB.getState().connected).toBe(false);
  });
});

describe("useTelemetryStore singleton", () => {
  it("is a named export that is a zustand store", () => {
    expect(useTelemetryStore).toBeDefined();
    expect(typeof useTelemetryStore.getState).toBe("function");
    expect(typeof useTelemetryStore.setState).toBe("function");
  });

  it("returns the same instance on every reference", () => {
    const ref1 = useTelemetryStore;
    const ref2 = useTelemetryStore;
    expect(ref1).toBe(ref2);
  });
});

describe("error state", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => { store = createTelemetryStore(); });

  it("initial error is null", () => {
    expect(store.getState().error).toBeNull();
  });

  it("setError updates the error field", () => {
    store.getState().setError("Connection lost");
    expect(store.getState().error).toBe("Connection lost");
  });

  it("setError(null) clears the error", () => {
    store.getState().setError("Connection lost");
    store.getState().setError(null);
    expect(store.getState().error).toBeNull();
  });
});

describe("isMock state", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => { store = createTelemetryStore(); });

  it("initial isMock is false", () => {
    expect(store.getState().isMock).toBe(false);
  });

  it("setIsMock(true) sets isMock to true", () => {
    store.getState().setIsMock(true);
    expect(store.getState().isMock).toBe(true);
  });

  it("setIsMock(false) resets isMock", () => {
    store.getState().setIsMock(true);
    store.getState().setIsMock(false);
    expect(store.getState().isMock).toBe(false);
  });
});

describe("selectConnected", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => { store = createTelemetryStore(); });

  it("returns false when not connected", () => {
    expect(selectConnected(store.getState())).toBe(false);
  });

  it("returns true after setTelemetry", () => {
    store.getState().setTelemetry(mockTelemetry);
    expect(selectConnected(store.getState())).toBe(true);
  });
});

describe("selectIsMock", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => { store = createTelemetryStore(); });

  it("returns false by default", () => {
    expect(selectIsMock(store.getState())).toBe(false);
  });

  it("returns true after setIsMock(true)", () => {
    store.getState().setIsMock(true);
    expect(selectIsMock(store.getState())).toBe(true);
  });
});

describe("raw data selectors", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => {
    store = createTelemetryStore();
    store.getState().setTelemetry(mockTelemetry);
  });

  it("selectPlayer returns player data", () => {
    expect(selectPlayer(store.getState())).toEqual(mockTelemetry.player);
  });
  it("selectEngine returns engine data", () => {
    expect(selectEngine(store.getState())).toEqual(mockTelemetry.engine);
  });
  it("selectTyres returns tyres data", () => {
    expect(selectTyres(store.getState())).toEqual(mockTelemetry.tyres);
  });
  it("selectLap returns lap data", () => {
    expect(selectLap(store.getState())).toEqual(mockTelemetry.lap);
  });
  it("selectSession returns session data", () => {
    expect(selectSession(store.getState())).toEqual(mockTelemetry.session);
  });
  it("selectVehicles returns vehicles array", () => {
    expect(selectVehicles(store.getState())).toEqual(mockTelemetry.vehicles);
  });
  it("selectTrack returns track data", () => {
    expect(selectTrack(store.getState())).toEqual(mockTelemetry.track);
  });
  it("selectInputs returns inputs data", () => {
    expect(selectInputs(store.getState())).toEqual(mockTelemetry.inputs);
  });
  it("selectWeather returns weather data", () => {
    expect(selectWeather(store.getState())).toEqual(mockTelemetry.weather);
  });

  it("all raw selectors return null when telemetry is null", () => {
    const emptyStore = createTelemetryStore();
    const state = emptyStore.getState();
    expect(selectPlayer(state)).toBeNull();
    expect(selectEngine(state)).toBeNull();
    expect(selectTyres(state)).toBeNull();
    expect(selectLap(state)).toBeNull();
    expect(selectSession(state)).toBeNull();
    expect(selectVehicles(state)).toBeNull();
    expect(selectTrack(state)).toBeNull();
    expect(selectInputs(state)).toBeNull();
    expect(selectWeather(state)).toBeNull();
  });
});

describe("calculated selectors", () => {
  let store: ReturnType<typeof createTelemetryStore>;
  beforeEach(() => {
    store = createTelemetryStore();
    store.getState().setTelemetry(mockTelemetry);
  });

  describe("selectFuelCalculations", () => {
    it("returns null when telemetry is null", () => {
      const emptyStore = createTelemetryStore();
      expect(selectFuelCalculations(emptyStore.getState())).toBeNull();
    });

    it("returns fuel calculations with data", () => {
      const result = selectFuelCalculations(store.getState())!;
      expect(result).not.toBeNull();
      expect(result.fuelPerLap).toBeGreaterThan(0);
      expect(result.lapsRemaining).toBeGreaterThan(0);
      expect(result.fuelToEnd).toBeGreaterThanOrEqual(0);
      expect(result.stintLength).toBeGreaterThan(0);
    });

    it("computes correct fuelPerLap from fuel used and laps completed", () => {
      const result = selectFuelCalculations(store.getState())!;
      expect(result.fuelPerLap).toBeCloseTo(8, 4);
    });

    it("computes correct stintLength from fuel capacity and fuelPerLap", () => {
      const result = selectFuelCalculations(store.getState())!;
      expect(result.stintLength).toBeCloseTo(12.5, 4);
    });
  });

  describe("selectGapCalculations", () => {
    it("returns null when telemetry is null", () => {
      const emptyStore = createTelemetryStore();
      expect(selectGapCalculations(emptyStore.getState())).toBeNull();
    });

    it("returns gapToLeader from player vehicle", () => {
      const result = selectGapCalculations(store.getState())!;
      expect(result.gapToLeader).toBe(3.5);
    });

    it("returns formatted gap string", () => {
      const result = selectGapCalculations(store.getState())!;
      expect(result.gapToLeaderFormatted).toBe("+3.500");
    });

    it("returns gapToCarAhead", () => {
      const result = selectGapCalculations(store.getState())!;
      expect(result.gapToCarAhead).toBeCloseTo(1.7, 4);
    });
  });

  describe("selectDeltaCalculations", () => {
    it("returns null when telemetry is null", () => {
      const emptyStore = createTelemetryStore();
      expect(selectDeltaCalculations(emptyStore.getState())).toBeNull();
    });

    it("returns deltaToBest from lap data", () => {
      const result = selectDeltaCalculations(store.getState())!;
      expect(result.deltaToBest).toBeCloseTo(0.667, 3);
    });

    it("returns estimatedLaptime based on completed sectors", () => {
      const result = selectDeltaCalculations(store.getState())!;
      expect(result.estimatedLaptime).toBeGreaterThan(0);
      expect(result.estimatedLaptime).toBeLessThan(100);
    });
  });
});
