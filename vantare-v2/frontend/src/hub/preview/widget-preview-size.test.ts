import { describe, expect, it } from "vitest";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { createDefaultRelativeColumns } from "../../overlay/widgets/relative-catalog";
import { getRelativeIntrinsicWidth } from "../../overlay/widgets/relative-format";
import { createDefaultStandingsColumns } from "../../overlay/widgets/standings-catalog";
import { getStandingsIntrinsicWidth } from "../../overlay/widgets/standings-format";
import { resolveWidgetPreviewBaseSize } from "./widget-preview-size";

function profileWith(widget: WidgetConfig): ProfileConfig {
  return {
    id: "profile-test",
    name: "Test",
    displayMode: "racing",
    monitorIndex: 0,
    widgets: [widget],
    variants: [],
  };
}

describe("resolveWidgetPreviewBaseSize", () => {
  it("returns declared size for non-configurable widgets", () => {
    const widget: WidgetConfig = {
      id: "delta",
      type: "delta",
      enabled: true,
      updateHz: 15,
      position: { x: 100, y: 200, w: 320, h: 140 },
      props: {},
    };

    expect(resolveWidgetPreviewBaseSize(profileWith(widget), widget)).toEqual({
      width: 320,
      height: 140,
      mode: "declared",
    });
  });

  it("uses relative intrinsic width even when declared width is wider", () => {
    const columns = createDefaultRelativeColumns();
    const intrinsicWidth = getRelativeIntrinsicWidth(columns);
    const widget: WidgetConfig = {
      id: "relative",
      type: "relative",
      enabled: true,
      updateHz: 15,
      position: { x: 80, y: 90, w: 900, h: 420 },
      variantId: "variant-relative",
      props: {},
    };
    const profile: ProfileConfig = {
      ...profileWith(widget),
      variants: [{ id: "variant-relative", widgetType: "relative", columns }],
    };

    expect(resolveWidgetPreviewBaseSize(profile, widget)).toEqual({
      width: intrinsicWidth,
      height: 420,
      mode: "intrinsic",
    });
    expect(widget.position).toEqual({ x: 80, y: 90, w: 900, h: 420 });
  });

  it("expands relative width when active columns need more than declared width", () => {
    const columns = createDefaultRelativeColumns().map((column) =>
      column.id === "bestLap" || column.id === "lastLap" ? { ...column, enabled: true } : column,
    );
    const intrinsicWidth = getRelativeIntrinsicWidth(columns);
    const widget: WidgetConfig = {
      id: "relative",
      type: "relative",
      enabled: true,
      updateHz: 15,
      position: { x: 80, y: 90, w: 220, h: 420 },
      variantId: "variant-relative",
      props: {},
    };
    const profile: ProfileConfig = {
      ...profileWith(widget),
      variants: [{ id: "variant-relative", widgetType: "relative", columns }],
    };

    const result = resolveWidgetPreviewBaseSize(profile, widget);

    expect(result.width).toBe(intrinsicWidth);
    expect(result.width).toBeGreaterThan(220);
    expect(result.height).toBe(420);
    expect(result.mode).toBe("intrinsic");
    expect(widget.position).toEqual({ x: 80, y: 90, w: 220, h: 420 });
  });
});

describe("resolveWidgetPreviewBaseSize — standings", () => {
  it("legacy standings without variant uses default intrinsic width when position is narrower", () => {
    const defaultColumns = createDefaultStandingsColumns();
    const defaultIntrinsicWidth = getStandingsIntrinsicWidth(defaultColumns);
    const widget: WidgetConfig = {
      id: "standings",
      type: "standings",
      enabled: true,
      updateHz: 15,
      position: { x: 0, y: 0, w: 200, h: 300 },
      props: {},
    };

    const result = resolveWidgetPreviewBaseSize(profileWith(widget), widget);

    expect(result.width).toBe(defaultIntrinsicWidth);
    expect(result.height).toBe(300);
    expect(result.mode).toBe("intrinsic");
    expect(widget.position).toEqual({ x: 0, y: 0, w: 200, h: 300 });
  });

  it("legacy standings without variant uses default intrinsic width even when position is wider", () => {
    const defaultColumns = createDefaultStandingsColumns();
    const defaultIntrinsicWidth = getStandingsIntrinsicWidth(defaultColumns);
    const widget: WidgetConfig = {
      id: "standings",
      type: "standings",
      enabled: true,
      updateHz: 15,
      position: { x: 0, y: 0, w: 600, h: 300 },
      props: {},
    };

    expect(resolveWidgetPreviewBaseSize(profileWith(widget), widget)).toEqual({
      width: defaultIntrinsicWidth,
      height: 300,
      mode: "intrinsic",
    });
    expect(widget.position).toEqual({ x: 0, y: 0, w: 600, h: 300 });
  });

  it("uses standings intrinsic width even when declared width is wider", () => {
    const columns = createDefaultStandingsColumns();
    const intrinsicWidth = getStandingsIntrinsicWidth(columns);
    const widget: WidgetConfig = {
      id: "standings",
      type: "standings",
      enabled: true,
      updateHz: 15,
      variantId: "variant-standings",
      position: { x: 0, y: 0, w: 600, h: 300 },
      props: {},
    };
    const profile: ProfileConfig = {
      ...profileWith(widget),
      variants: [{ id: "variant-standings", widgetType: "standings", columns }],
    };

    expect(resolveWidgetPreviewBaseSize(profile, widget)).toEqual({
      width: intrinsicWidth,
      height: 300,
      mode: "intrinsic",
    });
    expect(widget.position).toEqual({ x: 0, y: 0, w: 600, h: 300 });
  });

  it("expands standings width when optional columns need more than declared width", () => {
    const columns = createDefaultStandingsColumns().map((column) =>
      column.id === "bestLap" || column.id === "lastLap" || column.id === "interval"
        ? { ...column, enabled: true }
        : column,
    );
    const intrinsicWidth = getStandingsIntrinsicWidth(columns);
    const widget: WidgetConfig = {
      id: "standings",
      type: "standings",
      enabled: true,
      updateHz: 15,
      variantId: "variant-standings",
      position: { x: 0, y: 0, w: 240, h: 300 },
      props: {},
    };
    const profile: ProfileConfig = {
      ...profileWith(widget),
      variants: [{ id: "variant-standings", widgetType: "standings", columns }],
    };

    const result = resolveWidgetPreviewBaseSize(profile, widget);

    expect(result.width).toBe(intrinsicWidth);
    expect(result.width).toBeGreaterThan(240);
    expect(result.height).toBe(300);
    expect(result.mode).toBe("intrinsic");
    expect(widget.position).toEqual({ x: 0, y: 0, w: 240, h: 300 });
  });

  it("expands standings width by exactly one optional column when only that column is enabled", () => {
    const defaultColumns = createDefaultStandingsColumns();
    const defaultIntrinsicWidth = getStandingsIntrinsicWidth(defaultColumns);
    const columns = defaultColumns.map((column) =>
      column.id === "bestLap" ? { ...column, enabled: true } : column,
    );
    const expectedWidth = getStandingsIntrinsicWidth(columns);
    const widget: WidgetConfig = {
      id: "standings",
      type: "standings",
      enabled: true,
      updateHz: 15,
      variantId: "variant-standings",
      position: { x: 0, y: 0, w: 240, h: 300 },
      props: {},
    };
    const profile: ProfileConfig = {
      ...profileWith(widget),
      variants: [{ id: "variant-standings", widgetType: "standings", columns }],
    };

    const result = resolveWidgetPreviewBaseSize(profile, widget);

    expect(expectedWidth).toBeGreaterThan(defaultIntrinsicWidth);
    expect(result.width).toBe(expectedWidth);
    expect(result.height).toBe(300);
    expect(result.mode).toBe("intrinsic");
    expect(widget.position).toEqual({ x: 0, y: 0, w: 240, h: 300 });
  });
});