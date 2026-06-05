import type { Telemetry, SimAdapter } from '@vantare/sim-core';
import { SimNormalizer } from '@vantare/sim-core';

export class ACAdapter implements SimAdapter {
  readonly name = 'ac';
  readonly displayName = 'Assetto Corsa';
  private socket: import('dgram').Socket | null = null;
  private port = 9996;
  private normalizer = new SimNormalizer();
  private telemetryCallback?: (data: Telemetry) => void;
  private sessionCallback?: (data: Telemetry) => void;
  private connectionCallback?: (state: string) => void;

  isAvailable(): boolean { return true; }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const dgram = require('dgram');
        this.socket = dgram.createSocket('udp4');
        this.socket!.on('message', (msg: Buffer) => this.handlePacket(msg));
        this.socket!.on('error', (err: Error) => {
          console.error('AC adapter error:', err);
          this.connectionCallback?.('error');
          reject(err);
        });
        this.socket!.bind(this.port, () => {
          console.log('AC adapter listening on port', this.port);
          this.connectionCallback?.('connected');
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connectionCallback?.('disconnected');
    }
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

  private handlePacket(msg: Buffer): void {
    try {
      const raw = this.parseACPacket(msg);
      if (raw) {
        const telemetry = this.normalizer.normalize(raw, 'ac');
        this.telemetryCallback?.(telemetry);
      }
    } catch (err) {
      console.error('Error parsing AC packet:', err);
    }
  }

  private parseACPacket(msg: Buffer): Record<string, unknown> | null {
    try {
      const data: Record<string, unknown> = {};
      let offset = 0;

      if (msg.length >= 4) { data.speedKmh = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 8) { data.rpm = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 12) { data.gear = msg.readInt32LE(offset); offset += 4; }
      if (msg.length >= 16) { data.position = msg.readInt32LE(offset); offset += 4; }
      if (msg.length >= 20) { data.gas = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 24) { data.brake = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 28) { data.clutch = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 32) { data.steerAngle = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 36) { data.lastLap = msg.readFloatLE(offset) * 1000; offset += 4; }
      if (msg.length >= 40) { data.bestLap = msg.readFloatLE(offset) * 1000; offset += 4; }
      if (msg.length >= 44) { data.numberOfLaps = msg.readInt32LE(offset); offset += 4; }
      if (msg.length >= 48) { data.lap = msg.readInt32LE(offset); offset += 4; }
      if (msg.length >= 52) { data.fuel = msg.readFloatLE(offset); offset += 4; }
      if (msg.length >= 56) { data.fuelMax = msg.readFloatLE(offset); offset += 4; }

      if (msg.length >= 72) {
        const tyreTempOffset = 56;
        data.fl = { temp: msg.readFloatLE(tyreTempOffset), pressure: 0, wear: 0 };
        data.fr = { temp: msg.readFloatLE(tyreTempOffset + 4), pressure: 0, wear: 0 };
        data.rl = { temp: msg.readFloatLE(tyreTempOffset + 8), pressure: 0, wear: 0 };
        data.rr = { temp: msg.readFloatLE(tyreTempOffset + 12), pressure: 0, wear: 0 };
      }

      data.isOnTrack = true;
      data.isInPit = false;
      data.isPitting = false;
      data.driverName = 'Player';
      data.carNumber = '';
      data.teamName = '';

      return data;
    } catch (err) {
      console.error('Error parsing AC packet:', err);
      return null;
    }
  }
}
