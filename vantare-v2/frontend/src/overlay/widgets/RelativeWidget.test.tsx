import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelativeWidget } from "./RelativeWidget";

describe("RelativeWidget", () => {
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

  it("renders player and surrounding drivers in edit mode", () => {
    render(
      <RelativeWidget editMode={true} updateHz={15} />,
    );
    tick(100);
    expect(screen.getByText("VANTARE")).toBeTruthy();
    expect(screen.getByText("TOYOTA GAZOO")).toBeTruthy();
  });
});
