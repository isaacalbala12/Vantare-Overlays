import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObsOverlayApp } from "./ObsOverlayApp";
import { resetTelemetryRef } from "../lib/telemetry-ref";

type Handler = (event: { data: unknown }) => void;

const runtimeMock = vi.hoisted(() => ({
  handlers: new Map<string, Handler[]>(),
  emit: vi.fn(),
}));

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: (name: string, handler: Handler) => {
      runtimeMock.handlers.set(name, [...(runtimeMock.handlers.get(name) ?? []), handler]);
      return () =>
        runtimeMock.handlers.set(
          name,
          (runtimeMock.handlers.get(name) ?? []).filter((h) => h !== handler),
        );
    },
    Emit: runtimeMock.emit,
  },
}));

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("ObsOverlayApp", () => {
  beforeEach(() => {
    runtimeMock.handlers.clear();
    runtimeMock.emit.mockClear();
    resetTelemetryRef();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("accepts engineer-notifications widget without crash", () => {
    // Mock fetch to return a profile with engineer-notifications widget
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: {
              id: "obs-engineer-test",
              displayMode: "streaming",
              widgets: [
                {
                  id: "eng-obs",
                  type: "engineer-notifications",
                  enabled: true,
                  updateHz: 5,
                  position: { x: 50, y: 50, w: 300, h: 80 },
                },
              ],
            },
            layoutOrigin: { x: 0, y: 0 },
          }),
      } as Response),
    );

    render(<ObsOverlayApp />);
    tick(100);

    // ObsOverlayApp shows a loading state initially, then the profile content.
    // Since the engineer widget is rendered with __engineerTransport="sse" but no
    // active notification, it returns null (no visible element). The test verifies
    // no crash / no error rendering.
    expect(screen.queryByText("Failed to load profile")).toBeNull();
  });
});
