import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewWidgetFrame } from "./PreviewWidgetFrame";
import type { Rect, WidgetConfig } from "../../lib/profile";

function makeWidget(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: "test",
    type: "delta",
    enabled: true,
    position: { x: 0, y: 0, w: 400, h: 100 },
    ...overrides,
  };
}

describe("PreviewWidgetFrame resize handle", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders resize handle when selected", () => {
    render(
      <PreviewWidgetFrame
        widget={makeWidget()}
        selected={true}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId("resize-handle-test")).toBeTruthy();
  });

  it("does not render resize handle when not selected", () => {
    render(
      <PreviewWidgetFrame
        widget={makeWidget()}
        selected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("resize-handle-test")).toBeNull();
  });

  it("does not render resize handle when disabled", () => {
    render(
      <PreviewWidgetFrame
        widget={makeWidget()}
        selected={true}
        onSelect={vi.fn()}
        disabled={true}
      />,
    );
    expect(screen.queryByTestId("resize-handle-test")).toBeNull();
  });
});
