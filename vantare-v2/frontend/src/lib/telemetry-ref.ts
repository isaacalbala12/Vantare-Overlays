export type VehicleScoring = {
  id: number;
  driverName?: string;
  driverNumber?: string;
  place?: number;
  totalLaps?: number;
  vehicleClass?: string;
  isPlayer?: boolean;
  inPits?: boolean;
  timeBehindLeader?: number;
  teamBrandColor?: string;
  tireCompound?: string;
  fastestLap?: boolean;
};

export type PlayerDiff = {
  speed?: number;
  rpm?: number;
  gear?: number;
  fuel?: number;
  deltaBest?: number;
  throttle?: number;
  brake?: number;
};

export type SessionDiff = {
  trackName?: string;
  sessionTime?: number;
  numVehicles?: number;
  gamePhase?: number;
};

export type TelemetryPayload = {
  seq: number;
  snapshot: {
    connected: boolean;
    player?: {
      speed: number;
      gear: number;
      engineRPM: number;
      fuel?: number;
      deltaBest?: number;
      throttle?: number;
      brake?: number;
    };
    session?: {
      trackName?: string;
      sessionTime?: number;
      numVehicles?: number;
    };
    vehicles?: VehicleScoring[];
  };
  diff?: {
    t: number;
    d: Record<string, unknown>;
  };
};

export type TelemetryRefState = {
  seq: number;
  connected: boolean;
  speed: number;
  gear: number;
  rpm: number;
  fuel: number;
  deltaBest: number;
  trackName: string;
  throttle: number;
  brake: number;
  clutch: number;
  vehicles: VehicleScoring[];
};

const state: TelemetryRefState = {
  seq: 0,
  connected: false,
  speed: 0,
  gear: 0,
  rpm: 0,
  fuel: 0,
  deltaBest: 0,
  trackName: "",
  throttle: 0,
  brake: 0,
  clutch: 0,
  vehicles: [],
};

export function getTelemetryRef(): TelemetryRefState {
  return state;
}

export function parseTelemetryPayload(data: unknown): TelemetryPayload {
  if (typeof data === "string") {
    return JSON.parse(data) as TelemetryPayload;
  }
  if (data && typeof data === "object") {
    return data as TelemetryPayload;
  }
  throw new Error("invalid telemetry payload");
}

export function applyTelemetryUpdate(payload: TelemetryPayload) {
  state.seq = payload.seq;
  state.connected = payload.snapshot.connected;

  const p = payload.snapshot?.player;
  if (p) {
    state.speed = p.speed;
    state.gear = p.gear;
    state.rpm = p.engineRPM;
    if (p.fuel != null) state.fuel = p.fuel;
    if (p.deltaBest != null) state.deltaBest = p.deltaBest;
  if (p.throttle != null) state.throttle = normalizeInputToPercent(p.throttle);
  if (p.brake != null) state.brake = normalizeInputToPercent(p.brake);
  }

  const s = payload.snapshot?.session;
  if (s) {
    if (s.trackName != null) state.trackName = s.trackName;
  }

  if (payload.snapshot?.vehicles) {
    state.vehicles = payload.snapshot.vehicles;
  }

  // Apply diff overrides (vehicles are full replacement, not merged)
  const d = payload.diff?.d;
  if (d) {
    const pd = d.player as PlayerDiff | undefined;
    if (pd) {
      if (pd.speed != null) state.speed = pd.speed;
      if (pd.rpm != null) state.rpm = pd.rpm;
      if (pd.gear != null) state.gear = pd.gear;
      if (pd.fuel != null) state.fuel = pd.fuel;
      if (pd.deltaBest != null) state.deltaBest = pd.deltaBest;
    if (pd.throttle != null) state.throttle = normalizeInputToPercent(pd.throttle);
    if (pd.brake != null) state.brake = normalizeInputToPercent(pd.brake);
    }
    const sd = d.session as SessionDiff | undefined;
    if (sd) {
      if (sd.trackName != null) state.trackName = sd.trackName;
    }
    if (d.vehicles && Array.isArray(d.vehicles)) {
      state.vehicles = d.vehicles as VehicleScoring[];
    }
  }
}

/** @internal test helper */
export function resetTelemetryRefForTests() {
  state.seq = 0;
  state.connected = false;
  state.speed = 0;
  state.gear = 0;
  state.rpm = 0;
  state.fuel = 0;
  state.deltaBest = 0;
  state.trackName = "";
  state.throttle = 0;
  state.brake = 0;
  state.clutch = 0;
  state.vehicles = [];
}

function normalizeInputToPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Live sims send 0..1; HTML gauges expect 0..100. If already >1, assume percent.
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}
