import type { ProfileConfig, Rect, WidgetAppearance } from "../../lib/profile";

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normalizeRect(rect: Rect): Rect {
  return {
    x: clampInt(rect.x, 0, 3840),
    y: clampInt(rect.y, 0, 2160),
    w: clampInt(rect.w, 24, 3840),
    h: clampInt(rect.h, 24, 2160),
  };
}

export function updateWidgetPosition(profile: ProfileConfig, widgetId: string, rect: Rect): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId
        ? { ...widget, position: normalizeRect(rect) }
        : widget,
    ),
  };
}

export function updateWidgetAppearance(
  profile: ProfileConfig,
  widgetId: string,
  appearance: WidgetAppearance,
): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId
        ? {
            ...widget,
            props: {
              ...(widget.props ?? {}),
              appearance: {
                ...(widget.props?.appearance ?? {}),
                ...appearance,
              },
            },
          }
        : widget,
    ),
  };
}

export function setWidgetStyle(profile: ProfileConfig, widgetId: string, style: string): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((w) =>
      w.id === widgetId ? { ...w, style, props: { ...w.props, style } } : w,
    ),
  };
}

export function setWidgetEnabled(profile: ProfileConfig, widgetId: string, enabled: boolean): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, enabled } : widget,
    ),
  };
}
