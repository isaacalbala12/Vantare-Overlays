import * as koffi from 'koffi';
import type { SimAdapter, Telemetry } from '@vantare/sim-core';
import { SimNormalizer } from '@vantare/sim-core';

const FILE_MAP_READ = 0x0004;
const TELEMETRY_BUFFER_NAME = 'LMU_Data';
const TELEMETRY_BUFFER_SIZE = 262144;
const POLL_INTERVAL_MS = 1000 / 60;

export class LMUAdapter implements SimAdapter {
  readonly name = 'lmu';
  readonly displayName = 'Le Mans Ultimate';
  private normalizer = new SimNormalizer();
  private telemetryCallback?: (data: Telemetry) => void;
  private sessionCallback?: (data: Telemetry) => void;
  private connectionCallback?: (state: string) => void;
  private pollInterval?: ReturnType<typeof setInterval>;
  private lib?: ReturnType<typeof koffi.load>;
  private OpenFileMappingW!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private MapViewOfFile!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private UnmapViewOfFile!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private CloseHandle!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private hMapFile?: bigint;
  private pBuf?: Buffer;
  private connected = false;

  isAvailable(): boolean { return true; }

  async connect(): Promise<void> {
    try {
      this.lib ??= koffi.load('kernel32.dll');
      this.OpenFileMappingW = this.lib.func('void* OpenFileMappingW(uint32, bool, string)');
      this.MapViewOfFile = this.lib.func('void* MapViewOfFile(void*, uint32, uint32, uint32, size_t)');
      this.UnmapViewOfFile = this.lib.func('bool UnmapViewOfFile(void*)');
      this.CloseHandle = this.lib.func('bool CloseHandle(void*)');

      await this.openSharedMemory();
      this.connected = true;
      this.connectionCallback?.('connected');
      this.startPolling();
    } catch (err) {
      console.error('LMU adapter connect error:', err);
      this.connectionCallback?.('error');
      throw err;
    }
  }

  disconnect(): void {
    this.stopPolling();
    this.closeSharedMemory();
    this.connected = false;
    this.connectionCallback?.('disconnected');
  }

  onTelemetry(callback: (data: Telemetry) => void): () => void {
    this.telemetryCallback = callback;
    return () => { this.telemetryCallback = undefined; };
  }

  onSessionData(callback: (data: Telemetry) => void): () => void {
    this.sessionCallback = callback;
    return () => { this.sessionCallback = undefined; };
  }

  onConnectionState(callback: (state: string) => void): () => void {
    this.connectionCallback = callback;
    return () => { this.connectionCallback = undefined; };
  }

  destroy(): void {
    this.disconnect();
    this.telemetryCallback = undefined;
    this.sessionCallback = undefined;
    this.connectionCallback = undefined;
  }

  private openSharedMemory = async (): Promise<void> => {
    const hMap = this.OpenFileMappingW(FILE_MAP_READ, false, TELEMETRY_BUFFER_NAME);
    if (!hMap) {
      throw new Error('LMU shared memory not found. Is LMU running with rF2SharedMemoryMapPlugin enabled?');
    }
    this.hMapFile = hMap;

    const pBuf = this.MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, TELEMETRY_BUFFER_SIZE);
    if (!pBuf) {
      throw new Error('Failed to map LMU shared memory view');
    }

    const view = koffi.view(pBuf, TELEMETRY_BUFFER_SIZE);
    this.pBuf = Buffer.from(view);
  };

  private closeSharedMemory = (): void => {
    try {
      if (this.pBuf && this.hMapFile) {
        this.UnmapViewOfFile(this.pBuf);
        this.CloseHandle(this.hMapFile);
        this.pBuf = undefined;
        this.hMapFile = undefined;
      }
    } catch (err) {
      console.error('Error closing LMU shared memory:', err);
    }
  };

  private startPolling = (): void => {
    this.pollInterval = setInterval(() => {
      if (this.pBuf && this.connected) {
        try {
          const raw = this.parseSharedMemory(this.pBuf);
          if (raw) {
            const telemetry = this.normalizer.normalize(raw, 'lmu');
            this.telemetryCallback?.(telemetry);
          }
        } catch (err) {
          console.error('Error polling LMU shared memory:', err);
        }
      }
    }, POLL_INTERVAL_MS);
  };

  private stopPolling = (): void => {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  };

  private parseSharedMemory(buf: Buffer): Record<string, unknown> | null {
    try {
      if (buf.length < 256) return null;

      const mVersion = buf.readUInt32LE(4);
      const mIsValid = buf.readUInt32LE(8);
      if (!mIsValid || mVersion < 1) return null;

      const telemetryOffset = 64;
      if (buf.length < telemetryOffset + 256) return null;

      const data: Record<string, unknown> = {};
      data.sessionTime = buf.readFloatLE(telemetryOffset + 0);

      const lapTime = buf.readFloatLE(telemetryOffset + 12);
      data.lap = {
        current: Math.floor(buf.readFloatLE(telemetryOffset + 8) || 0),
        total: 0, lastTime: 0, bestTime: 0, sector: 0, sectorTimes: [],
        estimatedLaptime: lapTime * 1000, delta: 0,
        isPersonalBest: false, isSessionBest: false,
      };

      data.speed = buf.readFloatLE(telemetryOffset + 16);
      data.rpm = buf.readFloatLE(telemetryOffset + 20);
      data.gear = buf.readInt8(telemetryOffset + 24);
      data.steer = buf.readFloatLE(telemetryOffset + 28);
      data.throttle = buf.readFloatLE(telemetryOffset + 32);
      data.brake = buf.readFloatLE(telemetryOffset + 36);
      data.clutch = buf.readFloatLE(telemetryOffset + 40);
      data.position = buf.readInt32LE(telemetryOffset + 44);
      data.classPosition = buf.readInt32LE(telemetryOffset + 48);
      data.lapDistance = buf.readFloatLE(telemetryOffset + 52);
      data.fuel = buf.readFloatLE(telemetryOffset + 96);
      data.fuelMax = buf.readFloatLE(telemetryOffset + 100);
      data.engineWaterTemp = buf.readFloatLE(telemetryOffset + 104);
      data.engineOilTemp = buf.readFloatLE(telemetryOffset + 108);
      data.engineOilPressure = buf.readFloatLE(telemetryOffset + 112);
      data.trackTemp = buf.readFloatLE(telemetryOffset + 180);
      data.ambientTemp = buf.readFloatLE(telemetryOffset + 184);
      data.windSpeed = buf.readFloatLE(telemetryOffset + 188);
      data.windDirection = buf.readFloatLE(telemetryOffset + 192);
      data.maxRpm = buf.readFloatLE(telemetryOffset + 220);

      const nameOffset = telemetryOffset + 272;
      const nameLen = Math.min(64, buf.length - nameOffset);
      if (nameLen > 0) {
        data.driverName = buf.subarray(nameOffset, nameOffset + nameLen).toString('utf16le').replace(/\0/g, '');
      }

      data.isOnTrack = true;
      data.isInPit = false;
      data.isPitting = false;
      data.carNumber = '';
      data.teamName = '';
      data.sessionType = '';
      data.sessionState = '';
      data.engineWarnings = 0;
      data.fuelPressure = 0;
      data.humidity = 0;
      data.rainIntensity = 0;
      data.totalLaps = 0;
      data.trackName = '';
      data.trackLength = 0;
      data.sessionTimeRemain = 0;

      return data;
    } catch (err) {
      console.error('Error parsing LMU shared memory:', err);
      return null;
    }
  }
}
