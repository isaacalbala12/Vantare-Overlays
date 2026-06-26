import type { WidgetConfig, WidgetAppearance } from "../../lib/profile";

export type PedalsSettings = {
  pedalThrottleColor: string;
  pedalBrakeColor: string;
  pedalClutchColor: string;
  backgroundColor: string;
};

export const PEDALS_DEFAULT_APPEARANCE: PedalsSettings = {
  pedalThrottleColor: "#34d399",
  pedalBrakeColor: "#e63946",
  pedalClutchColor: "#3aa6c8",
  backgroundColor: "transparent",
};

function readStringDefault(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (value.length === 0) return fallback;
  return value;
}

export function readPedalsSettings(widget: WidgetConfig): PedalsSettings {
  const raw = widget.props?.appearance;
  const appearance: WidgetAppearance =
    raw && typeof raw === "object" ? (raw as WidgetAppearance) : {};

  return {
    pedalThrottleColor: readStringDefault(
      appearance.pedalThrottleColor,
      PEDALS_DEFAULT_APPEARANCE.pedalThrottleColor,
    ),
    pedalBrakeColor: readStringDefault(
      appearance.pedalBrakeColor,
      PEDALS_DEFAULT_APPEARANCE.pedalBrakeColor,
    ),
    pedalClutchColor: readStringDefault(
      appearance.pedalClutchColor,
      PEDALS_DEFAULT_APPEARANCE.pedalClutchColor,
    ),
    backgroundColor: readStringDefault(
      appearance.backgroundColor,
      PEDALS_DEFAULT_APPEARANCE.backgroundColor,
    ),
  };
}
