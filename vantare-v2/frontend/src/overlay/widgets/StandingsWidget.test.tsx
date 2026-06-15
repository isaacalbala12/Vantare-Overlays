import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StandingsWidget } from "./StandingsWidget";

describe("StandingsWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function tick(ms: number) {
    act(() => { vi.advanceTimersByTime(ms); });
  }

  it("renders header and driver rows with mock data in edit mode", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { accentColor: "#9b2226" } }} />,
    );
    tick(100);
    expect(screen.getByText("VANTARE")).toBeTruthy();
    expect(screen.getByText("ALPINE")).toBeTruthy();
  });

  it("applies custom border color from appearance to the panel border", () => {
    const { container } = render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { borderColor: "#ff0000" } }} />,
    );
    const panel = container.querySelector("[data-testid='standings-panel']") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.borderColor).toBe("#ff0000");
  });

  it("renders tire compound badges for soft tires", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { tireSoftColor: "#E63946" } }} />,
    );
    tick(100);
    const badges = screen.getAllByText("S");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows pit indicator for cars in pits", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} />,
    );
    tick(100);
    expect(screen.getByText("IN PIT")).toBeTruthy();
  });
});
