import { describe, expect, it } from "vitest";
import type { WidgetConfig, WidgetAppearance } from "../../lib/profile";
import { readPedalsSettings, PEDALS_DEFAULT_APPEARANCE } from "./pedals-settings";

const pedalsWidget: WidgetConfig = {
  id: "pedals",
  type: "pedals",
  enabled: true,
  position: { x: 40, y: 760, w: 90, h: 100 },
};

describe("readPedalsSettings", () => {
  it("returns catalog defaults when appearance is absent", () => {
    const settings = readPedalsSettings(pedalsWidget);
    expect(settings.pedalThrottleColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalThrottleColor);
    expect(settings.pedalBrakeColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalBrakeColor);
    expect(settings.pedalClutchColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalClutchColor);
    expect(settings.backgroundColor).toBe(PEDALS_DEFAULT_APPEARANCE.backgroundColor);
  });

  it("returns overrides from props.appearance when present", () => {
    const widget: WidgetConfig = {
      ...pedalsWidget,
      props: {
        appearance: {
          pedalThrottleColor: "#00ff00",
          pedalBrakeColor: "#0000ff",
          pedalClutchColor: "#ff0000",
          backgroundColor: "#1a0104",
        },
      },
    };
    const settings = readPedalsSettings(widget);
    expect(settings.pedalThrottleColor).toBe("#00ff00");
    expect(settings.pedalBrakeColor).toBe("#0000ff");
    expect(settings.pedalClutchColor).toBe("#ff0000");
    expect(settings.backgroundColor).toBe("#1a0104");
  });

  it("falls back to defaults for individual missing fields", () => {
    const widget: WidgetConfig = {
      ...pedalsWidget,
      props: { appearance: { pedalThrottleColor: "#00ff00" } },
    };
    const settings = readPedalsSettings(widget);
    expect(settings.pedalThrottleColor).toBe("#00ff00");
    expect(settings.pedalBrakeColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalBrakeColor);
    expect(settings.pedalClutchColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalClutchColor);
    expect(settings.backgroundColor).toBe(PEDALS_DEFAULT_APPEARANCE.backgroundColor);
  });

  it("treats non-object appearance as absent", () => {
    const widget: WidgetConfig = {
      ...pedalsWidget,
      props: { appearance: "not-an-object" as unknown as WidgetAppearance },
    };
    const settings = readPedalsSettings(widget);
    expect(settings.pedalThrottleColor).toBe(PEDALS_DEFAULT_APPEARANCE.pedalThrottleColor);
  });

  it("preserves transparent backgroundColor when explicitly set", () => {
    const widget: WidgetConfig = {
      ...pedalsWidget,
      props: { appearance: { backgroundColor: "transparent" } },
    };
    const settings = readPedalsSettings(widget);
    expect(settings.backgroundColor).toBe("transparent");
  });

  it("falls back to default when backgroundColor is empty string", () => {
    const widget: WidgetConfig = {
      ...pedalsWidget,
      props: { appearance: { backgroundColor: "" } },
    };
    const settings = readPedalsSettings(widget);
    expect(settings.backgroundColor).toBe(PEDALS_DEFAULT_APPEARANCE.backgroundColor);
  });
});

describe("PEDALS_DEFAULT_APPEARANCE", () => {
  it("matches the vantare-racing catalog defaults for pedals", () => {
    expect(PEDALS_DEFAULT_APPEARANCE.pedalThrottleColor).toBe("#34d399");
    expect(PEDALS_DEFAULT_APPEARANCE.pedalBrakeColor).toBe("#e63946");
    expect(PEDALS_DEFAULT_APPEARANCE.pedalClutchColor).toBe("#3aa6c8");
    expect(PEDALS_DEFAULT_APPEARANCE.backgroundColor).toBe("transparent");
  });
});
