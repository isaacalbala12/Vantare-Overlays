import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProfilesPage } from "./ProfilesPage";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

describe("ProfilesPage", () => {
  afterEach(() => cleanup());

  it("renders heading", () => {
    render(<ProfilesPage />);
    expect(screen.getByText("Overlays")).toBeTruthy();
  });
});
