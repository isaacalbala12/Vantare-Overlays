import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppearanceEditor } from "./AppearanceEditor";

afterEach(() => { cleanup(); });

describe("AppearanceEditor", () => {
  it("renders color inputs for standings-specific properties", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="standings"
        appearance={{ accentColor: "#9b2226" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Accent")).toBeTruthy();
  });

  it("does not render pedal colors for delta widget", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="delta"
        appearance={{ positiveColor: "#e74c3c" }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByLabelText("Throttle")).toBeNull();
  });

  it("calls onChange when a color value is changed", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="delta"
        appearance={{ positiveColor: "#e74c3c" }}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Positivo") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#ff0000" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ positiveColor: "#ff0000" }),
    );
  });
});
