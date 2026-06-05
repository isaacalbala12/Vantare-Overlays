import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserWindow } from "electron";
import { SimManager } from "../sim-manager";

const mockSend = vi.hoisted(() => vi.fn());
const mockIsDestroyed = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockGetData = vi.hoisted(() => vi.fn());
const mockSetScenario = vi.hoisted(() => vi.fn());
const mockGetAvailableSims = vi.hoisted(() => vi.fn());
const mockNormalize = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    webContents: { send: mockSend },
    isDestroyed: mockIsDestroyed,
  })),
}));

const mockProvider = vi.hoisted(() => ({
  name: "iRacing Mock",
  simType: "iracing" as const,
  getData: mockGetData,
  setScenario: mockSetScenario,
  getAvailableSims: mockGetAvailableSims,
}));

vi.mock("@vantare/sim-core", () => ({
  MockSimFactory: { create: vi.fn().mockReturnValue(mockProvider) },
  SimNormalizer: vi.fn().mockImplementation(() => ({
    normalize: mockNormalize,
  })),
}));

describe("SimManager", () => {
  let simManager: SimManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSend.mockClear();
    mockGetData.mockClear();
    mockSetScenario.mockClear();
    mockGetAvailableSims.mockClear();
    mockIsDestroyed.mockClear();
    mockNormalize.mockClear();
    mockIsDestroyed.mockReturnValue(false);
    simManager = new SimManager(new BrowserWindow());
  });

  afterEach(() => {
    simManager.stop();
    vi.useRealTimers();
  });

  it("activates mock mode when no sim is running", () => {
    expect(simManager.isMockActive).toBe(false);
    simManager.start();
    expect(simManager.isMockActive).toBe(true);
  });

  it("emits sim-state event after mock activation", () => {
    simManager.start();
    expect(mockSend).toHaveBeenCalledWith("sim-state", {
      connected: true,
      name: "iracing",
      type: "iracing",
      isMock: true,
    });
  });

  it("getTelemetry returns null when not started", () => {
    expect(simManager.getTelemetry()).toBeNull();
  });

  it("getTelemetry normalizes mock data through SimNormalizer", () => {
    const rawTelemetry = {
      sim: "iracing",
      timestamp: Date.now(),
      isConnected: true,
      player: {
        speed: 100, rpm: 5000, gear: 3,
        isOnTrack: true, isInPit: false, isPitting: false,
        position: 1, classPosition: 1,
        lapDistance: 500, lapCount: 1,
        driverName: "Test", carNumber: "1", teamName: "Test Team",
      },
      engine: { rpm: 5000, maxRpm: 8000, fuelLevel: 80, fuelCapacity: 100, fuelPressure: 40, waterTemp: 90, oilTemp: 95, oilPressure: 50, engineWarnings: 0 },
      tyres: {
        fl: { temp: 90, pressure: 25, wear: 0.9 },
        fr: { temp: 91, pressure: 25, wear: 0.9 },
        rl: { temp: 88, pressure: 24, wear: 0.85 },
        rr: { temp: 89, pressure: 24, wear: 0.85 },
      },
      lap: { currentLap: 1, totalLaps: 20, lastLaptime: 90000, bestLaptime: 88000, sector: 1, sector1: 30000, sector2: 30000, sector3: 30000, estimatedLaptime: 90000, delta: 0, isPersonalBest: false, isSessionBest: false },
      session: { type: "race", state: "running", timeRemaining: 3600, timeElapsed: 120, totalLaps: 20, flags: [], trackName: "Spa", trackLength: 7004, weather: { airTemp: 20, trackTemp: 25, humidity: 60, precipitation: 0, windSpeed: 5, windDirection: 180 } },
      vehicles: [],
      track: { name: "Spa", length: 7004, sectors: [2614, 1900, 2490] },
      inputs: { throttle: 0.8, brake: 0, clutch: 0, steering: 0 },
      weather: { airTemp: 20, trackTemp: 25, humidity: 60, precipitation: 0, windSpeed: 5, windDirection: 180 },
    };
    mockGetData.mockReturnValue(rawTelemetry);
    simManager.start();
    const result = simManager.getTelemetry();
    expect(mockGetData).toHaveBeenCalledOnce();
    expect(mockNormalize).not.toHaveBeenCalled();
    expect(result).toBe(rawTelemetry);
  });

  it("getTelemetry returns null when mock is not active", () => {
    expect(simManager.getTelemetry()).toBeNull();
  });

  it("stop() clears the poll interval and provider", () => {
    simManager.start();
    expect(simManager.isMockActive).toBe(true);
    simManager.stop();
    expect(() => vi.advanceTimersByTime(4000)).not.toThrow();
    expect(simManager.getTelemetry()).toBeNull();
  });
});
