import type { WidgetAppearance } from "../../lib/profile";
import { getWidgetStyleFromProps, getWidgetAppearance } from "../../lib/profile";
import { getDefaultAppearance } from "../../hub/state/style-catalog";

export function resolveWidgetAppearance(
  type: string,
  props?: Record<string, unknown>,
): { style: string; appearance: Required<WidgetAppearance> } {
  const style = getWidgetStyleFromProps(type, props);
  const defaults = getDefaultAppearance(type, style);
  const overrides = getWidgetAppearance(props);

  return {
    style,
    appearance: {
      accentColor: overrides.accentColor ?? defaults.accentColor ?? "#9b2226",
      backgroundColor: overrides.backgroundColor ?? defaults.backgroundColor ?? "#000000",
      textColor: overrides.textColor ?? defaults.textColor ?? "#FFFFFF",
      borderColor: overrides.borderColor ?? defaults.borderColor ?? "#9b2226",
      opacity: overrides.opacity ?? defaults.opacity ?? 1,
      positiveColor: overrides.positiveColor ?? defaults.positiveColor ?? "#e74c3c",
      negativeColor: overrides.negativeColor ?? defaults.negativeColor ?? "#2ecc71",
      rpmGreen: overrides.rpmGreen ?? defaults.rpmGreen ?? "#2ecc71",
      rpmYellow: overrides.rpmYellow ?? defaults.rpmYellow ?? "#f1c40f",
      rpmRed: overrides.rpmRed ?? defaults.rpmRed ?? "#e74c3c",
      rpmBlue: overrides.rpmBlue ?? defaults.rpmBlue ?? "#3498db",
      pedalThrottleColor: overrides.pedalThrottleColor ?? defaults.pedalThrottleColor ?? "#2ecc71",
      pedalBrakeColor: overrides.pedalBrakeColor ?? defaults.pedalBrakeColor ?? "#e74c3c",
      pedalClutchColor: overrides.pedalClutchColor ?? defaults.pedalClutchColor ?? "#3498db",
      posLeaderColor: overrides.posLeaderColor ?? defaults.posLeaderColor ?? "#f1c40f",
      pitColor: overrides.pitColor ?? defaults.pitColor ?? "#f1c40f",
      tireSoftColor: overrides.tireSoftColor ?? defaults.tireSoftColor ?? "#E63946",
      tireMediumColor: overrides.tireMediumColor ?? defaults.tireMediumColor ?? "#f1c40f",
      tireHardColor: overrides.tireHardColor ?? defaults.tireHardColor ?? "#ffffff",
      gapAheadColor: overrides.gapAheadColor ?? defaults.gapAheadColor ?? "#f87171",
      gapBehindColor: overrides.gapBehindColor ?? defaults.gapBehindColor ?? "#4ade80",
    },
  };
}
