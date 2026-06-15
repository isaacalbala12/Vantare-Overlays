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

  describe("setWidgetStyle", () => {
    it("updates style in both top-level and props", () => {
      const result = setWidgetStyle(profile, "delta", "custom-style");
      const widget = result.widgets.find((w) => w.id === "delta")!;
      expect(widget.style).toBe("custom-style");
      expect(widget.props?.style).toBe("custom-style");
    });
  });
});
