import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewCanvas } from "./PreviewCanvas";
import type { ProfileConfig } from "../../lib/profile";

const profile: ProfileConfig = {
  id: "preview-test",
  name: "Preview Test",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    {
      id: "delta",
      type: "delta",
      enabled: true,
      position: { x: 760, y: 820, w: 400, h: 160 },
      props: {},
    },
  ],
};

describe("PreviewCanvas", () => {
  it("renders a logical 1920x1080 scene scaled inside the preview viewport", () => {
    render(
      <PreviewCanvas
        profile={profile}
        selectedWidgetId="delta"
        onSelectWidget={() => {}}
        onChangeProfile={() => {}}
      />,
    );

    const viewport = screen.getByTestId("preview-viewport");
    const scene = screen.getByTestId("preview-scene");
    const frame = screen.getByTestId("preview-widget-frame-delta");

    expect(viewport.style.width).toBe("960px");
    expect(viewport.style.height).toBe("540px");
    expect(scene.style.width).toBe("1920px");
    expect(scene.style.height).toBe("1080px");
    expect(scene.style.transform).toBe("scale(0.5)");
    expect(scene.style.transformOrigin).toBe("top left");
    expect(frame.style.left).toBe("760px");
    expect(frame.style.top).toBe("820px");
    expect(frame.style.width).toBe("400px");
    expect(frame.style.height).toBe("160px");
  });
});
