import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WidgetEditFrame } from "./WidgetEditFrame";
import type { WidgetConfig } from "../lib/profile";

vi.mock("./shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

function makeWidget(): WidgetConfig {
  return {
    id: "w1",
    type: "delta",
    enabled: true,
    updateHz: 30,
    position: { x: 10, y: 10, w: 100, h: 50 },
    props: {},
  };
}

describe("WidgetEditFrame", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the widget", () => {
    render(<WidgetEditFrame widget={makeWidget()} onChange={vi.fn()} />);
    expect(screen.getByTestId("edit-frame-w1")).toBeTruthy();
  });

  it("calls onChange after resize", () => {
    const onChange = vi.fn();
    render(<WidgetEditFrame widget={makeWidget()} onChange={onChange} />);
    const handle = screen.getByTestId("resize-handle-w1");
    fireEvent.mouseDown(handle, { clientX: 110, clientY: 60 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 80 });
    fireEvent.mouseUp(window);
    expect(onChange).toHaveBeenCalled();
    const rect = onChange.mock.calls[0][1];
    expect(rect.w).toBeGreaterThan(100);
    expect(rect.h).toBeGreaterThan(50);
  });
});
