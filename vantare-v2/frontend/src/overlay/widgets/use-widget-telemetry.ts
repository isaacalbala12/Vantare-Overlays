import { getTelemetryRef, type TelemetryRefState } from "../../lib/telemetry-ref";
import { getMockTelemetry } from "./mock-telemetry";

export type WidgetTelemetryMode = "live" | "mock";

/**
 * Returns the telemetry source for a widget.
 * Runtime overlays pass "live"; Hub preview passes "mock" unless a future live-preview mode is enabled.
 */
export function getWidgetTelemetrySource(mode: WidgetTelemetryMode): () => TelemetryRefState {
  return mode === "mock" ? getMockTelemetry : getTelemetryRef;
}
