import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const {
  onListeners,
  eventsOn,
  eventsOff,
  eventsEmit,
  useLicenseMock,
} = vi.hoisted(() => {
  const onListeners = new Map<string, (event: unknown) => void>();
  return {
    onListeners,
    eventsOn: vi.fn((name: string, cb: (event: unknown) => void) => {
      onListeners.set(name, cb);
      return () => onListeners.delete(name);
    }),
    eventsOff: vi.fn(),
    eventsEmit: vi.fn(),
    useLicenseMock: vi.fn(),
  };
});

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: eventsOn,
    Off: eventsOff,
    Emit: eventsEmit,
  },
}));

vi.mock("../../lib/license", () => ({
  LicenseProvider: ({ children }: { children: ReactNode }) => children,
  useLicense: useLicenseMock,
}));

import { LicenseBanner } from "./LicenseBanner";

describe("LicenseBanner", () => {
  beforeEach(() => {
    onListeners.clear();
    eventsOn.mockClear();
    eventsEmit.mockClear();
    eventsOff.mockClear();
    useLicenseMock.mockReset();
    cleanup();
  });

  it("renders nothing when state is active", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "active",
        entitlements: ["overlays"],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });

  it("renders grace message with countdown when in grace", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "grace",
        entitlements: ["overlays"],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
        graceEndsAt: "2026-12-31T23:59:59Z",
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.getByTestId("license-banner")).toBeTruthy();
    expect(screen.getByText(/gracia/i)).toBeTruthy();
  });

  it("renders expired message when state is expired", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "expired",
        entitlements: [],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.getByText(/expirada/i)).toBeTruthy();
  });

  it("renders device-limit message when state is device-limit", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "device-limit",
        entitlements: ["overlays"],
        userId: "u",
        email: "u@example.com",
        deviceOK: false,
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.getByText(/dispositivo/i)).toBeTruthy();
  });

  it("renders nothing while loading", () => {
    useLicenseMock.mockReturnValue({
      result: null,
      loading: true,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });

  it("renders nothing when result is null", () => {
    useLicenseMock.mockReturnValue({
      result: null,
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });

  it("renders nothing for anonymous state (banner is only for non-active users with entitlements)", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "anonymous",
        entitlements: [],
        userId: "",
        email: "",
        deviceOK: true,
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });

  it("renders nothing for authenticated-no-entitlement (handled by paywall, not banner)", () => {
    useLicenseMock.mockReturnValue({
      result: {
        state: "authenticated-no-entitlement",
        entitlements: [],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      loading: false,
      refresh: vi.fn(),
    });
    render(<LicenseBanner />);
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });
});