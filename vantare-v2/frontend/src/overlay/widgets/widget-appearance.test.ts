import { describe, expect, it } from "vitest";
import { resolveWidgetAppearance } from "./widget-appearance";

describe("resolveWidgetAppearance", () => {
  it("returns style defaults when no overrides", () => {
    const { style, appearance } = resolveWidgetAppearance("standings");
    expect(style).toBe("vantare-racing");
    expect(appearance.accentColor).toBe("#9b2226");
    expect(appearance.posLeaderColor).toBe("#f1c40f");
  });

  it("reads style from props.style", () => {
    const { style } = resolveWidgetAppearance("standings", { style: "custom" });
    expect(style).toBe("custom");
  });

  it("overrides defaults with props.appearance", () => {
    const { appearance } = resolveWidgetAppearance("standings", {
      appearance: { accentColor: "#000000" },
    });
    expect(appearance.accentColor).toBe("#000000");
    expect(appearance.textColor).toBe("#FFFFFF");
  });
});
