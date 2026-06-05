import { useTelemetryStore } from "../stores/telemetry-store";
import type { Telemetry } from "@vantare/sim-core";

interface UseTelemetryResult {
  telemetry: Telemetry | null;
  connected: boolean;
  error: string | null;
  isLoading: boolean;
}

export function useTelemetry(): UseTelemetryResult {
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const connected = useTelemetryStore((s) => s.connected);
  const error = useTelemetryStore((s) => s.error);

  const isLoading = !connected && !telemetry && !error;

  return { telemetry, connected, error, isLoading };
}
