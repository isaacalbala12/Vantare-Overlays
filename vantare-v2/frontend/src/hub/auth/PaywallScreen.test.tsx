import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PaywallScreen } from "./PaywallScreen";

describe("PaywallScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders plan cards with prices", () => {
    render(<PaywallScreen email="u@example.com" />);
    expect(screen.getByText(/overlays/i)).toBeTruthy();
    expect(screen.getByText(/engineer/i)).toBeTruthy();
    expect(screen.getByText(/AC Lua Pack/i)).toBeTruthy();
    expect(screen.getByText(/5/)).toBeTruthy();
    expect(screen.getByText(/20/)).toBeTruthy();
  });

  it("renders email banner", () => {
    render(<PaywallScreen email="isaac@example.com" />);
    expect(screen.getByText(/isaac@example.com/)).toBeTruthy();
  });

  it("logs the plan key when Suscribirse is clicked", () => {
    const log = console.log as unknown as ReturnType<typeof vi.fn>;
    render(<PaywallScreen email="u@example.com" />);
    const buttons = screen.getAllByRole("button", { name: /suscribirse/i });
    fireEvent.click(buttons[0]);
    expect(log).toHaveBeenCalledWith(
      "subscribe",
      expect.stringContaining("beta_access"),
      "u@example.com",
    );
  });

  it("renders two distinct plans", () => {
    render(<PaywallScreen email="u@example.com" />);
    const buttons = screen.getAllByRole("button", { name: /suscribirse/i });
    expect(buttons.length).toBe(2);
  });
});