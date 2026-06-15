import { getTelemetryRef, type TelemetryRefState } from "../../lib/telemetry-ref";
import { getMockTelemetry } from "./mock-telemetry";

/**
 * Returns the telemetry source for a widget.
 * In editMode (Preview), it returns the static mock telemetry.
 * In runtime, it returns the live telemetry ref.
 */
export function getWidgetTelemetrySource(editMode: boolean): () => TelemetryRefState {
  return editMode ? getMockTelemetry : getTelemetryRef;
}
