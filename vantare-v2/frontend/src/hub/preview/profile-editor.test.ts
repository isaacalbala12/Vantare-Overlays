import { describe, expect, it } from "vitest";
import type { ProfileConfig } from "../../lib/profile";
import {
  updateWidgetPosition,
  updateWidgetAppearance,
  setWidgetEnabled,
  setWidgetStyle,
} from "./profile-editor";

const profile: ProfileConfig = {
  id: "default-racing",
  name: "Default Racing",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    {
      id: "delta",
      type: "delta",
      enabled: true,
      position: { x: 10, y: 20, w: 100, h: 50 },
    },
  ],
};

describe("profile-editor", () => {
  it("updates widget position immutably", () => {
    const next = updateWidgetPosition(profile, "delta", { x: 30, y: 40, w: 120, h: 60 });
    expect(next).not.toBe(profile);
    expect(next.widgets[0].position).toEqual({ x: 30, y: 40, w: 120, h: 60 });
    expect(profile.widgets[0].position).toEqual({ x: 10, y: 20, w: 100, h: 50 });
  });

  it("updates appearance inside props", () => {
    const next = updateWidgetAppearance(profile, "delta", {
      accentColor: "#34D399",
      backgroundColor: "rgba(0,0,0,0.35)",
      textColor: "#FFFFFF",
      opacity: 0.8,
    });
    expect(next.widgets[0].props?.appearance?.accentColor).toBe("#34D399");
    expect(next.widgets[0].props?.appearance?.opacity).toBe(0.8);
  });

  it("toggles widget enabled", () => {
    const next = setWidgetEnabled(profile, "delta", false);
    expect(next.widgets[0].enabled).toBe(false);
  });

  it("preserves schema v2 layouts and variants when editing widget appearance", () => {
    const v2Profile: ProfileConfig = {
      id: "v2-racing",
      name: "V2 Racing",
      schemaVersion: 2,
      displayMode: "edit",
      monitorIndex: 0,
      widgets: [
        {
          id: "relative",
          type: "relative",
          variantId: "variant-relative-default",
          enabled: true,
          position: { x: 40, y: 600, w: 320, h: 280 },
        },
      ],
      layouts: {
        general: {
          type: "general",
          widgets: [
            {
              id: "relative",
              type: "relative",
              variantId: "variant-relative-default",
              enabled: true,
              position: { x: 40, y: 600, w: 320, h: 280 },
            },
          ],
        },
      },
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

    const next = updateWidgetAppearance(v2Profile, "relative", { accentColor: "#E63946" });

    expect(next.schemaVersion).toBe(2);
    expect(next.layouts?.general?.widgets[0].variantId).toBe("variant-relative-default");
    expect(next.variants?.[0].templateId).toBe("relative-vantare-default");
    expect(next.widgets[0].props?.appearance?.accentColor).toBe("#E63946");
  });

  describe("setWidgetStyle", () => {
    it("updates style in both top-level and props", () => {
      const result = setWidgetStyle(profile, "delta", "custom-style");
      const widget = result.widgets.find((w) => w.id === "delta")!;
      expect(widget.style).toBe("custom-style");
      expect(widget.props?.style).toBe("custom-style");
    });
  });
});
