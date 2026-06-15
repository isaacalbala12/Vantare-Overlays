export type OpsMetrics = {
  timestamp: string;
  app: {
    memoryMb: number;
    cpuPercent: number | null;
    goroutines: number;
  };
  source: {
    kind: string;
    name: string;
    live: boolean;
    available: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isOpsMetrics(value: unknown): value is OpsMetrics {
  if (!isRecord(value) || !isRecord(value.app) || !isRecord(value.source)) {
    return false;
  }
  const cpu = value.app.cpuPercent;
  return (
    typeof value.timestamp === "string" &&
    typeof value.app.memoryMb === "number" &&
    (typeof cpu === "number" || cpu === null) &&
    typeof value.app.goroutines === "number" &&
    typeof value.source.kind === "string" &&
    typeof value.source.name === "string" &&
    typeof value.source.live === "boolean" &&
    typeof value.source.available === "boolean"
  );
}
