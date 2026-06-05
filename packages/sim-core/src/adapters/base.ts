import type { Telemetry } from '../types';

export type { Telemetry } from '../types';

export interface SimAdapter {
  readonly name: string;
  readonly displayName: string;
  isAvailable(): boolean;
  connect(): Promise<void>;
  disconnect(): void;
  onTelemetry(callback: (data: Telemetry) => void): () => void;
  onSessionData(callback: (data: Telemetry) => void): () => void;
  onConnectionState(callback: (state: string) => void): () => void;
  destroy(): void;
}
