import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetPreviewPanel } from "./WidgetPreviewPanel";
import type { WidgetConfig } from "../../lib/profile";

afterEach(() => {
  cleanup();
});

const widget: WidgetConfig = {
  id: "delta",
  type: "delta",
  enabled: true,
  updateHz: 30,
  position: { x: 760, y: 40, w: 400, h: 48 },
};

describe("WidgetPreviewPanel", () => {
  it("renders selected widget details", () => {
    render(<WidgetPreviewPanel widget={widget} />);

    expect(screen.getAllByText("delta").length).toBeGreaterThan(0);
    expect(screen.getByText("Tipo: delta")).toBeTruthy();
    expect(screen.getByText("30 Hz")).toBeTruthy();
  });

  it("renders empty state without a widget", () => {
    render(<WidgetPreviewPanel widget={null} />);

    expect(screen.getByText("Selecciona un widget")).toBeTruthy();
  });
});
