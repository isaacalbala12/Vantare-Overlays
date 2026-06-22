import { describe, expect, it } from "vitest";
import type { ProfileConfig, WidgetConfig } from "./profile";
import {
  enrichWidgetPropsWithVariant,
  findWidgetVariant,
  toggleRelativeColumn,
  withDefaultWidgetVariants,
} from "./widget-variants";

function relativeWidget(): WidgetConfig {
  return {
    id: "relative",
    type: "relative",
    variantId: "variant-relative-default",
    enabled: true,
    updateHz: 15,
    position: { x: 40, y: 600, w: 320, h: 280 },
    props: { rangeAhead: 3, rangeBehind: 3, style: "vantare-racing" },
  };
}

function profile(): ProfileConfig {
  return {
    schemaVersion: 2,
    id: "v2",
    displayMode: "edit",
    monitorIndex: 0,
    widgets: [relativeWidget()],
    variants: [
      {
        id: "variant-relative-default",
        widgetType: "relative",
        templateId: "relative-vantare-default",
        themeId: "vantare-racing",
        name: "Relative Default",
      },
    ],
  };
}

describe("widget variants", () => {
  it("finds the selected widget variant", () => {
    const p = profile();

    expect(findWidgetVariant(p, p.widgets[0])?.id).toBe("variant-relative-default");
  });

  it("adds default Relative columns without changing widget position", () => {
    const p = withDefaultWidgetVariants(profile());
    const variant = p.variants?.[0];

    expect(p.widgets[0].position).toEqual({ x: 40, y: 600, w: 320, h: 280 });
    expect(variant?.columns?.map((column) => [column.id, column.enabled])).toEqual([
      ["position", true],
      ["class", true],
      ["carNumber", true],
      ["driverName", true],
      ["gap", true],
      ["bestLap", false],
      ["lastLap", false],
    ]);
  });

  it("toggles a Relative optional column in the variant only", () => {
    const p = withDefaultWidgetVariants(profile());
    const next = toggleRelativeColumn(p, "relative", "bestLap", true);

    expect(next.widgets[0].position).toEqual(p.widgets[0].position);
    expect(next.widgets[0].props).toEqual(p.widgets[0].props);
    expect(next.variants?.[0].columns?.find((column) => column.id === "bestLap")?.enabled).toBe(true);
  });

  it("enriches widget props with variant columns for renderers", () => {
    const p = toggleRelativeColumn(withDefaultWidgetVariants(profile()), "relative", "lastLap", true);
    const props = enrichWidgetPropsWithVariant(p, p.widgets[0]);

    expect(props.rangeAhead).toBe(3);
    expect(props.style).toBe("vantare-racing");
    expect(props.variant?.templateId).toBe("relative-vantare-default");
    expect(props.variant?.columns.find((column) => column.id === "lastLap")?.enabled).toBe(true);
  });

  it("ignores unknown column toggles", () => {
    const p = withDefaultWidgetVariants(profile());
    const next = toggleRelativeColumn(p, "relative", "unknown", true);

    expect(next).toBe(p);
  });

  it("handles legacy profiles without schemaVersion, variantId or variants", () => {
    const legacyProfile: ProfileConfig = {
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [
        {
          id: "relative",
          type: "relative",
          enabled: true,
          updateHz: 15,
          position: { x: 40, y: 600, w: 320, h: 280 },
          props: { rangeAhead: 3, rangeBehind: 3 },
        },
      ],
    };

    // 1. withDefaultWidgetVariants añade variantId al widget relative y crea variant con columnas default
    const normalized = withDefaultWidgetVariants(legacyProfile);
    expect(normalized.widgets[0].variantId).toBe("variant-relative-default");
    expect(normalized.variants).toHaveLength(1);
    expect(normalized.variants?.[0].id).toBe("variant-relative-default");
    expect(normalized.variants?.[0].columns).toBeDefined();
    expect(normalized.variants?.[0].columns?.find((c) => c.id === "bestLap")?.enabled).toBe(false);

    // 2. toggleRelativeColumn activa bestLap en perfil legacy
    const toggled = toggleRelativeColumn(legacyProfile, "relative", "bestLap", true);
    expect(toggled.widgets[0].variantId).toBe("variant-relative-default");
    expect(toggled.variants?.[0].columns?.find((c) => c.id === "bestLap")?.enabled).toBe(true);

    // 3. widget.position se preserva
    expect(toggled.widgets[0].position).toEqual({ x: 40, y: 600, w: 320, h: 280 });

    // 4. enrichWidgetPropsWithVariant devuelve props.variant.columns para legacy
    const props = enrichWidgetPropsWithVariant(toggled, toggled.widgets[0]);
    expect(props.variant?.columns).toBeDefined();
    expect(props.variant?.columns.find((c) => c.id === "bestLap")?.enabled).toBe(true);
  });
});
