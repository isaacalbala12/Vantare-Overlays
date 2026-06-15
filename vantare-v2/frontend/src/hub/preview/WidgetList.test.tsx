import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetList } from "./WidgetList";
import type { WidgetConfig } from "../../lib/profile";

afterEach(() => {
  cleanup();
});

const widgets: WidgetConfig[] = [
  { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 1, y: 2, w: 3, h: 4 } },
  { id: "standings", type: "standings", enabled: false, updateHz: 15, position: { x: 5, y: 6, w: 7, h: 8 } },
];

describe("WidgetList", () => {
  it("renders enabled and disabled widgets", () => {
    render(<WidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={vi.fn()} />);

    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.getByText("standings")).toBeTruthy();
    expect(screen.getByText("Visible")).toBeTruthy();
    expect(screen.getByText("Oculto")).toBeTruthy();
  });

  it("selects a widget", () => {
    const onSelectWidget = vi.fn();
    render(<WidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={onSelectWidget} />);

    fireEvent.click(screen.getByTestId("widget-list-standings"));

    expect(onSelectWidget).toHaveBeenCalledWith("standings");
  });
});
