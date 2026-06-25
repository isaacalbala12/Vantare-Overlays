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

  it("renders engineer-notifications widget entry and type in add dropdown", () => {
    const engWidget: WidgetConfig = {
      id: "eng-1",
      type: "engineer-notifications",
      enabled: true,
      updateHz: 5,
      position: { x: 0, y: 0, w: 300, h: 80 },
    };
    render(<WidgetList widgets={[...widgets, engWidget]} selectedWidgetId="delta" onSelectWidget={vi.fn()} />);

    // Widget entry is visible with its icon (engineer-notifications uses a chat-like SVG path)
    expect(screen.getByTestId("widget-list-eng-1")).toBeTruthy();

    // engineer-notifications is in the "add widget" dropdown
    fireEvent.click(screen.getByText("+ Añadir widget"));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("engineer-notifications");
  });

  it("selects a widget", () => {
    const onSelectWidget = vi.fn();
    render(<WidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={onSelectWidget} />);

    fireEvent.click(screen.getByTestId("widget-list-standings"));

    expect(onSelectWidget).toHaveBeenCalledWith("standings");
  });
});
