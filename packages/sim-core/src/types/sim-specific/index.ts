// Sim-specific raw telemetry types before normalization
// Each simulator provides data in its own format via its adapter

export interface IRacingRawTelemetry {
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  fuelLevel: number;
  fuelCapacity: number;
  fuelPressure: number;
  waterTemp: number;
  oilTemp: number;
  oilPressure: number;
  engineWarnings: number;
  lap: number;
  lapDistance: number;
  lapCompleted: number;
  lapsComplete: number;
  lapDelta: number;
  lapDeltaToSessionBest: number;
  lapDeltaToOptimal: number;
  lapDeltaToSessionOptimal: number;
  lat: number;
  lon: number;
  alt: number;
  pitch: number;
  roll: number;
  yaw: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  tireLF: TireData;
  tireRF: TireData;
  tireLR: TireData;
  tireRR: TireData;
  carIdx: number;
  teamInfo: TeamRawData;
  sessionTime: number;
  sessionNum: number;
  sessionState: number;
  sessionFlags: number;
  trackTemp: number;
  airTemp: number;
  trackTempCrew: number;
  relativeHumidity: number;
  windVel: number;
  windDir: number;
  precipitation: number;
}

export interface LMURawTelemetry {
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  steer: number;
  clutch: number;
  fuel: number;
  fuelMax: number;
  engineWaterTemp: number;
  engineOilTemp: number;
  engineOilPressure: number;
  tyres: LMUTyres;
  lap: LMULap;
  position: number;
  classPosition: number;
  worldPosition: [number, number, number];
  session: LMUSession;
  trackTemp: number;
  ambientTemp: number;
  rainIntensity: number;
  windSpeed: number;
  windDirection: number;
}

export interface ACRawTelemetry {
  rpm: number;
  speedKmh: number;
  gear: number;
  gas: number;
  brake: number;
  clutch: number;
  steerAngle: number;
  fuel: number;
  fuelMax: number;
  waterTemp: number;
  oilTemp: number;
  oilPressure: number;
  tyres: ACTyres;
  position: number;
  numberOfLaps: number;
  lapTime: number;
  lastLap: number;
  bestLap: number;
  session: ACSession;
  performanceMeter: number;
  trackGrip: number;
  heading: number;
  pitch: number;
  roll: number;
  abs: number;
  tc: number;
  enginePower: number;
  engineTorque: number;
  maxRpm: number;
  brakeBias: number;
}

// Re-exported helper types used by the raw interfaces above

export interface TireData {
  pressure: number;
  temp: number;
  wear: number;
  surfaceTemp: number;
  carcassTemp: number;
  camber: number;
  slip: number;
  load: number;
}

export interface LMUTyres {
  fl: TireData;
  fr: TireData;
  rl: TireData;
  rr: TireData;
}

export interface ACTyres {
  fl: ACTyre;
  fr: ACTyre;
  rl: ACTyre;
  rr: ACTyre;
}

export interface ACTyre {
  pressure: number;
  temp: number;
  wear: number;
  coreTemp: number;
}

export interface LMULap {
  current: number;
  total: number;
  lastTime: number;
  bestTime: number;
  sector: number;
  sectorTimes: [number, number, number];
  delta: number;
}

export interface TeamRawData {
  id: number;
  name: string;
  driverName: string;
  carNumber: string;
  carClassId: number;
  carClass: string;
  carPath: string;
  carName: string;
}

export interface LMUSession {
  type: number;
  state: number;
  timeRemaining: number;
  timeElapsed: number;
  totalLaps: number;
  flags: number;
  trackName: string;
}

export interface ACSession {
  type: number;
  state: number;
  time: number;
  laps: number;
  track: string;
  trackConfig: string;
}
