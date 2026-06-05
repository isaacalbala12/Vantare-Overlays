export interface Telemetry {
    sim: 'iracing' | 'lmu' | 'ac';
    timestamp: number;
    isConnected: boolean;
    player: PlayerData;
    engine: EngineData;
    tyres: TyreData;
    lap: LapData;
    session: SessionData;
    vehicles: VehicleData[];
    track: TrackData;
    inputs: InputData;
    weather: WeatherData;
}
export interface PlayerData {
    speed: number;
    rpm: number;
    gear: number;
    isOnTrack: boolean;
    isInPit: boolean;
    isPitting: boolean;
    position: number;
    classPosition: number;
    lapDistance: number;
    lapCount: number;
    driverName: string;
    carNumber: string;
    teamName: string;
}
export interface VehicleData {
    id: number;
    driverName: string;
    carNumber: string;
    teamName: string;
    position: number;
    classPosition: number;
    gap: number;
    gapType: 'seconds' | 'laps';
    lastLaptime: number;
    bestLaptime: number;
    sectorTimes: [number, number, number];
    speed: number;
    isPlayer: boolean;
    isPitting: boolean;
    tyreCompound: string;
    fuelRemaining: number;
    color: string;
}
export interface EngineData {
    rpm: number;
    maxRpm: number;
    fuelLevel: number;
    fuelCapacity: number;
    fuelPressure: number;
    waterTemp: number;
    oilTemp: number;
    oilPressure: number;
    engineWarnings: number;
}
export interface TyreData {
    fl: TyreInfo;
    fr: TyreInfo;
    rl: TyreInfo;
    rr: TyreInfo;
}
export interface TyreInfo {
    temp: number;
    pressure: number;
    wear: number;
}
export interface LapData {
    currentLap: number;
    totalLaps: number;
    lastLaptime: number;
    bestLaptime: number;
    sector: number;
    sector1: number;
    sector2: number;
    sector3: number;
    estimatedLaptime: number;
    delta: number;
    isPersonalBest: boolean;
    isSessionBest: boolean;
}
export interface SessionData {
    type: string;
    state: string;
    timeRemaining: number;
    timeElapsed: number;
    totalLaps: number;
    flags: Flag[];
    trackName: string;
    trackLength: number;
    weather: WeatherData;
}
export interface Flag {
    type: string;
    active: boolean;
}
export interface TrackData {
    name: string;
    length: number;
    sectors: number[];
}
export interface InputData {
    throttle: number;
    brake: number;
    clutch: number;
    steering: number;
}
export interface WeatherData {
    airTemp: number;
    trackTemp: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    windDirection: number;
}
export type SimType = 'iracing' | 'lmu' | 'ac';
export interface SimState {
    connected: boolean;
    name: string | null;
    type: SimType | null;
    isMock: boolean;
}
export interface Session {
    cars: VehicleData[];
    sessionInfo: SessionData;
}
//# sourceMappingURL=index.d.ts.map