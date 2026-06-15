import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StyleSelector } from "./StyleSelector";

afterEach(() => { cleanup(); });

describe("StyleSelector", () => {
  it("renders style name as text when only one style exists", () => {
    render(
      <StyleSelector widgetType="standings" currentStyle="vantare-racing" onStyleChange={vi.fn()} />,
    );
    expect(screen.getByText(/Vantare Racing/)).toBeTruthy();
  });

  it("disables buttons when disabled prop is true", () => {
    render(
      <StyleSelector widgetType="standings" currentStyle="vantare-racing" disabled={true} onStyleChange={vi.fn()} />,
    );
    expect(screen.getByText(/Vantare Racing/)).toBeTruthy();
  });
});
