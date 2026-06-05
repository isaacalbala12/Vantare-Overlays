import { create } from "zustand";
import type {
  Telemetry,
  PlayerData,
  EngineData,
  TyreData,
  LapData,
  SessionData,
  VehicleData,
  TrackData,
  InputData,
  WeatherData,
} from "@vantare/sim-core";
import {
  calculateFuelPerLap,
  calculateLapsRemaining,
  calculateFuelToEnd,
  calculateStintLength,
} from "@vantare/sim-core/calculations";
import { calculateDeltaToBest } from "@vantare/sim-core/calculations";
import { formatGap } from "@vantare/sim-core/calculations";
import { calculateEstimatedLaptime } from "@vantare/sim-core/calculations";

// ── State interface ──────────────────────────────────────────────

export interface TelemetryState {
  telemetry: Telemetry | null;
  setTelemetry: (data: Telemetry) => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isMock: boolean;
  setIsMock: (isMock: boolean) => void;
}

// ── Factory (for test isolation) ─────────────────────────────────

export const createTelemetryStore = () =>
  create<TelemetryState>((set) => ({
    telemetry: null,
    connected: false,
    error: null,
    isMock: false,
    setTelemetry: (data: Telemetry) => set({ telemetry: data, connected: true }),
    setConnected: (connected: boolean) => set({ connected }),
    setError: (error: string | null) => set({ error }),
    setIsMock: (isMock: boolean) => set({ isMock }),
  }));

// ── Singleton ────────────────────────────────────────────────────

export const useTelemetryStore = createTelemetryStore();

// ── Raw data selectors ───────────────────────────────────────────

export const selectPlayer = (state: TelemetryState): PlayerData | null =>
  state.telemetry?.player ?? null;

export const selectEngine = (state: TelemetryState): EngineData | null =>
  state.telemetry?.engine ?? null;

export const selectTyres = (state: TelemetryState): TyreData | null =>
  state.telemetry?.tyres ?? null;

export const selectLap = (state: TelemetryState): LapData | null =>
  state.telemetry?.lap ?? null;

export const selectSession = (state: TelemetryState): SessionData | null =>
  state.telemetry?.session ?? null;

export const selectVehicles = (state: TelemetryState): VehicleData[] | null =>
  state.telemetry?.vehicles ?? null;

export const selectTrack = (state: TelemetryState): TrackData | null =>
  state.telemetry?.track ?? null;

export const selectInputs = (state: TelemetryState): InputData | null =>
  state.telemetry?.inputs ?? null;

export const selectWeather = (state: TelemetryState): WeatherData | null =>
  state.telemetry?.weather ?? null;

// ── Meta selectors ───────────────────────────────────────────────

export const selectConnected = (state: TelemetryState): boolean =>
  state.connected;

export const selectIsMock = (state: TelemetryState): boolean =>
  state.isMock;

// ── Calculated selectors ─────────────────────────────────────────

export interface FuelCalculations {
  fuelPerLap: number;
  lapsRemaining: number;
  fuelToEnd: number;
  stintLength: number;
}

export const selectFuelCalculations = (state: TelemetryState): FuelCalculations | null => {
  const t = state.telemetry;
  if (!t) return null;

  const lapsCompleted = Math.max(1, t.lap.currentLap - 1);
  const fuelUsed = t.engine.fuelCapacity - t.engine.fuelLevel;
  const lapsRemainingTotal = Math.max(0, t.lap.totalLaps - t.lap.currentLap);

  const fuelPerLap = calculateFuelPerLap(fuelUsed, lapsCompleted);
  const lapsRemaining = calculateLapsRemaining(t.engine.fuelLevel, fuelPerLap);
  const fuelToEnd = calculateFuelToEnd(t.engine.fuelLevel, fuelPerLap, lapsRemainingTotal);
  const stintLength = calculateStintLength(t.engine.fuelCapacity, fuelPerLap);

  return { fuelPerLap, lapsRemaining, fuelToEnd, stintLength };
};

export interface GapCalculations {
  gapToLeader: number;
  gapToCarAhead: number;
  gapToLeaderFormatted: string;
}

export const selectGapCalculations = (state: TelemetryState): GapCalculations | null => {
  const t = state.telemetry;
  if (!t) return null;

  const playerVehicle = t.vehicles.find((v) => v.isPlayer);
  if (!playerVehicle) return null;

  const gapToLeader = playerVehicle.gap;
  const gapToLeaderFormatted = formatGap(gapToLeader);

  const carsAhead = t.vehicles
    .filter((v) => v.position < playerVehicle.position && !v.isPlayer)
    .sort((a, b) => b.position - a.position);

  const gapToCarAhead = carsAhead.length > 0
    ? Math.max(0, playerVehicle.gap - carsAhead[0].gap)
    : 0;

  return { gapToLeader, gapToCarAhead, gapToLeaderFormatted };
};

export interface DeltaCalculations {
  deltaToBest: number;
  estimatedLaptime: number;
}

export const selectDeltaCalculations = (state: TelemetryState): DeltaCalculations | null => {
  const t = state.telemetry;
  if (!t) return null;

  const deltaToBest = calculateDeltaToBest(t.lap.lastLaptime, t.lap.bestLaptime);

  const completedSectors: number[] = [];
  if (t.lap.sector >= 2 && t.lap.sector1 > 0) completedSectors.push(t.lap.sector1);
  if (t.lap.sector >= 3 && t.lap.sector2 > 0) completedSectors.push(t.lap.sector2);

  const estimatedLaptime = calculateEstimatedLaptime(
    t.lap.sector,
    completedSectors,
    t.lap.lastLaptime,
  );

  return { deltaToBest, estimatedLaptime };
};
