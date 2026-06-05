import * as koffi from 'koffi';
import type { SimAdapter, Telemetry } from '@vantare/sim-core';
import { SimNormalizer } from '@vantare/sim-core';

const MEMORY_NAME = 'Local\\IRSDKMemMapFileName';
const MEMORY_SIZE = 1164 * 1024;
const POLL_INTERVAL_MS = 1000 / 60;

export class IRacingAdapter implements SimAdapter {
  readonly name = 'iracing';
  readonly displayName = 'iRacing';
  private normalizer = new SimNormalizer();
  private telemetryCallback?: (data: Telemetry) => void;
  private sessionCallback?: (data: Telemetry) => void;
  private connectionCallback?: (state: string) => void;
  private pollInterval?: ReturnType<typeof setInterval>;
  private lib?: ReturnType<typeof koffi.load>;
  private OpenFileMappingA!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private MapViewOfFile!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private UnmapViewOfFile!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private CloseHandle!: ReturnType<ReturnType<typeof koffi.load>['func']>;
  private hMapFile?: bigint;
  private pBuf?: Buffer;
  private connected = false;
  private sessionInfo: Record<string, unknown> = {};

  isAvailable(): boolean { return true; }

  async connect(): Promise<void> {
    try {
      this.lib ??= koffi.load('kernel32.dll');
      this.OpenFileMappingA = this.lib.func('void* OpenFileMappingA(uint32, bool, string)');
      this.MapViewOfFile = this.lib.func('void* MapViewOfFile(void*, uint32, uint32, uint32, size_t)');
      this.UnmapViewOfFile = this.lib.func('bool UnmapViewOfFile(void*)');
      this.CloseHandle = this.lib.func('bool CloseHandle(void*)');

      const nameBuffer = Buffer.from(MEMORY_NAME + '\0');
      const FILE_MAP_READ = 0x0004;

      const hMap = this.OpenFileMappingA(FILE_MAP_READ, false, nameBuffer);
      if (!hMap) {
        throw new Error('iRacing shared memory not found. Is iRacing running?');
      }
      this.hMapFile = hMap;

      const pBuf = this.MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, MEMORY_SIZE);
      if (!pBuf) {
        this.CloseHandle(hMap);
        throw new Error('Failed to map iRacing shared memory view');
      }

      const view = koffi.view(pBuf, MEMORY_SIZE);
      this.pBuf = Buffer.from(view);

      this.connected = true;
      this.connectionCallback?.('connected');
      this.startPolling();
    } catch (err) {
      console.error('iRacing adapter connect error:', err);
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

  private closeSharedMemory = (): void => {
    try {
      if (this.pBuf && this.hMapFile) {
        this.UnmapViewOfFile(this.pBuf);
        this.CloseHandle(this.hMapFile);
        this.pBuf = undefined;
        this.hMapFile = undefined;
      }
    } catch (err) {
      console.error('Error closing iRacing shared memory:', err);
    }
  };

  private startPolling = (): void => {
    this.pollInterval = setInterval(() => {
      if (this.pBuf && this.connected) {
        try {
          const raw = this.parseSharedMemory(this.pBuf);
          if (raw) {
            const telemetry = this.normalizer.normalize(raw, 'iracing');
            this.telemetryCallback?.(telemetry);
          }
        } catch (err) {
          console.error('Error polling iRacing shared memory:', err);
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

      const data: Record<string, unknown> = {};
      const version = buf.readInt32LE(0);
      if (version <= 0) return null;

      const sessionOffset = 16;
      this.sessionInfo = {
        sessionType: this.readString(buf, sessionOffset + 0, 32),
        trackName: this.readString(buf, sessionOffset + 32, 64),
        trackLength: buf.readFloatLE(sessionOffset + 96),
      };

      const telemOffset = 256;

      data.sessionTime = buf.readFloatLE(telemOffset + 0);
      data.lap = buf.readInt32LE(telemOffset + 4);
      data.lapDistance = buf.readFloatLE(telemOffset + 8);
      data.position = buf.readInt32LE(telemOffset + 12);
      data.classPosition = buf.readInt32LE(telemOffset + 16);

      data.speed = buf.readFloatLE(telemOffset + 20);
      data.rpm = buf.readFloatLE(telemOffset + 24);
      data.maxRpm = buf.readFloatLE(telemOffset + 28);

      data.gear = buf.readInt8(telemOffset + 32);

      data.throttle = buf.readFloatLE(telemOffset + 36);
      data.brake = buf.readFloatLE(telemOffset + 40);
      data.clutch = buf.readFloatLE(telemOffset + 44);
      data.steering = buf.readFloatLE(telemOffset + 48);

      data.lastLaptime = buf.readFloatLE(telemOffset + 52) * 1000;
      data.bestLaptime = buf.readFloatLE(telemOffset + 56) * 1000;

      data.fuelLevel = buf.readFloatLE(telemOffset + 60);
      data.fuelCapacity = buf.readFloatLE(telemOffset + 64);

      data.waterTemp = buf.readFloatLE(telemOffset + 68);
      data.oilTemp = buf.readFloatLE(telemOffset + 72);
      data.oilPressure = buf.readFloatLE(telemOffset + 76);

      data.sessionType = this.sessionInfo.sessionType;
      data.sessionState = '';
      data.trackName = this.sessionInfo.trackName;
      data.trackLength = this.sessionInfo.trackLength;
      data.sessionTimeRemain = 0;

      data.driverName = this.readString(buf, telemOffset + 80, 32);
      data.carNumber = this.readString(buf, telemOffset + 112, 8);

      data.airTemp = buf.readFloatLE(telemOffset + 200);
      data.trackTemp = buf.readFloatLE(telemOffset + 204);
      data.windSpeed = buf.readFloatLE(telemOffset + 208);
      data.windDir = buf.readFloatLE(telemOffset + 212);

      data.isOnTrack = true;
      data.isInPit = false;
      data.isPitting = false;
      data.fuelPressure = 0;
      data.engineWarnings = 0;
      data.lapsComplete = 0;
      data.totalLaps = 0;
      data.sector = 0;
      data.sector1 = 0;
      data.sector2 = 0;
      data.sector3 = 0;
      data.estimatedLaptime = 0;
      data.lapDelta = 0;
      data.isPersonalBest = false;
      data.isSessionBest = false;
      data.relativeHumidity = 0;
      data.precipitation = 0;
      data.teamName = '';

      return data;
    } catch (err) {
      console.error('Error parsing iRacing shared memory:', err);
      return null;
    }
  }

  private readString(buf: Buffer, offset: number, maxLen: number): string {
    if (offset >= buf.length) return '';
    const end = Math.min(offset + maxLen, buf.length);
    const bytes = buf.subarray(offset, end);
    const nullIdx = bytes.indexOf(0);
    if (nullIdx >= 0) {
      return bytes.subarray(0, nullIdx).toString('utf8').trim();
    }
    return bytes.toString('utf8').trim();
  }
}
