import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { enrichWidgetPropsWithVariant } from "../../lib/widget-variants";
import { getRelativeIntrinsicWidth } from "../../overlay/widgets/relative-format";
import { getStandingsIntrinsicWidth } from "../../overlay/widgets/standings-format";

export type WidgetPreviewBaseSize = {
  width: number;
  height: number;
  mode: "declared" | "intrinsic";
};

export function resolveWidgetPreviewBaseSize(
  profile: ProfileConfig,
  widget: WidgetConfig,
): WidgetPreviewBaseSize {
  const declared = {
    width: widget.position.w,
    height: widget.position.h,
    mode: "declared" as const,
  };

  const intrinsicWidth = computeIntrinsicWidth(profile, widget);
  if (intrinsicWidth == null) {
    return declared;
  }

  return {
    width: intrinsicWidth,
    height: widget.position.h,
    mode: "intrinsic",
  };
}

function computeIntrinsicWidth(profile: ProfileConfig, widget: WidgetConfig): number | null {
  if (widget.type === "relative") {
    const props = enrichWidgetPropsWithVariant(profile, widget);
    const columns = props.variant?.columns ?? [];
    if (columns.length === 0) return null;
    return getRelativeIntrinsicWidth(columns);
  }

  if (widget.type === "standings") {
    const props = enrichWidgetPropsWithVariant(profile, widget);
    const columns = props.variant?.columns ?? [];
    if (columns.length === 0) return null;
    return getStandingsIntrinsicWidth(columns);
  }

  return null;
}
