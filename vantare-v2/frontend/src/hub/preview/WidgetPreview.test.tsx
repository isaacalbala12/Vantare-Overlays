import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WidgetPreview } from "./WidgetPreview";
import type { WidgetConfig } from "../../lib/profile";

function makeWidget(type: string): WidgetConfig {
  return {
    id: "w1",
    type,
    enabled: true,
    updateHz: 30,
    position: { x: 0, y: 0, w: 400, h: 200 },
    props: {},
  };
}

vi.mock("../../overlay/shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

describe("WidgetPreview", () => {
  it("renders the real widget component scaled", () => {
    render(<WidgetPreview widget={makeWidget("delta")} scale={0.5} />);
    expect(screen.getByTestId("delta-mock")).toBeTruthy();
  });

  it("renders placeholder for unknown widget type", () => {
    render(<WidgetPreview widget={makeWidget("unknown")} scale={0.5} />);
    expect(screen.getByText("unknown")).toBeTruthy();
  });
});
