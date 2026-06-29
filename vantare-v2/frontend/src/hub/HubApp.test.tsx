import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const {
  onListeners,
  eventsOn,
  eventsOff,
  eventsEmit,
  useLicenseMock,
  loginScreenMock,
  paywallScreenMock,
  licenseBannerMock,
  getSessionMock,
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
    loginScreenMock: vi.fn(),
    paywallScreenMock: vi.fn(),
    licenseBannerMock: vi.fn(),
    getSessionMock: vi.fn(),
  };
});

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: eventsOn,
    Off: eventsOff,
    Emit: eventsEmit,
  },
}));

vi.mock("../lib/license", () => ({
  LicenseProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLicense: useLicenseMock,
}));

vi.mock("../lib/supabase-auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("./auth/LoginScreen", () => ({
  LoginScreen: ({ onLoggedIn }: { onLoggedIn: (token?: string) => void }) => {
    loginScreenMock();
    return (
      <div data-testid="login-screen">
        <button
          type="button"
          data-testid="trigger-login"
          onClick={() => onLoggedIn("tok-123")}
        >
          trigger
        </button>
        <button
          type="button"
          data-testid="trigger-login-bare"
          onClick={() => onLoggedIn(undefined)}
        >
          bare
        </button>
      </div>
    );
  },
}));

vi.mock("./auth/PaywallScreen", () => ({
  PaywallScreen: ({ email }: { email: string }) => {
    paywallScreenMock(email);
    return <div data-testid="paywall-screen">paywall {email}</div>;
  },
}));

vi.mock("./auth/LicenseBanner", () => ({
  LicenseBanner: () => {
    licenseBannerMock();
    return <div data-testid="license-banner">banner</div>;
  },
}));

import { HubApp } from "./HubApp";

function setLicense(result: unknown, loading = false) {
  useLicenseMock.mockReturnValue({
    result,
    loading,
    refresh: vi.fn(),
  });
}

describe("HubApp gate (production)", () => {
  beforeEach(() => {
    cleanup();
    onListeners.clear();
    eventsOn.mockClear();
    eventsEmit.mockClear();
    useLicenseMock.mockReset();
    loginScreenMock.mockReset();
    paywallScreenMock.mockReset();
    licenseBannerMock.mockReset();
    getSessionMock.mockReset();
    // Default to "no session" so the bridge does not blow up tests that do
    // not explicitly set the session token.
    getSessionMock.mockResolvedValue(null);
  });

  it("shows loading screen while license is loading", () => {
    setLicense(null, true);
    render(<HubApp />);
    expect(screen.getByTestId("license-loading")).toBeTruthy();
  });

  it("blocks normal use with LoginScreen when anonymous", () => {
    setLicense({
      state: "anonymous",
      entitlements: [],
      userId: "",
      email: "",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(loginScreenMock).toHaveBeenCalled();
    expect(screen.getByTestId("login-screen")).toBeTruthy();
    expect(screen.queryByTestId("paywall-screen")).toBeNull();
    expect(screen.queryByTestId("license-banner")).toBeNull();
  });

  it("falls back to login when result is null", () => {
    setLicense(null, false);
    render(<HubApp />);
    expect(screen.getByTestId("login-screen")).toBeTruthy();
  });

  it("blocks with PaywallScreen on expired", () => {
    setLicense({
      state: "expired",
      entitlements: [],
      userId: "u",
      email: "exp@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(paywallScreenMock).toHaveBeenCalledWith("exp@example.com");
    expect(screen.getByTestId("paywall-screen")).toBeTruthy();
    expect(screen.queryByTestId("login-screen")).toBeNull();
  });

  it("blocks with PaywallScreen on device-limit", () => {
    setLicense({
      state: "device-limit",
      entitlements: ["overlays"],
      userId: "u",
      email: "dev@example.com",
      deviceOK: false,
    });
    render(<HubApp />);
    expect(paywallScreenMock).toHaveBeenCalledWith("dev@example.com");
  });

  it("blocks with PaywallScreen on authenticated-no-entitlement", () => {
    setLicense({
      state: "authenticated-no-entitlement",
      entitlements: [],
      userId: "u",
      email: "u@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(paywallScreenMock).toHaveBeenCalledWith("u@example.com");
  });

  it("renders shell with banner when active", () => {
    setLicense({
      state: "active",
      entitlements: ["overlays"],
      userId: "u",
      email: "u@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(licenseBannerMock).toHaveBeenCalled();
    expect(screen.getByTestId("license-banner")).toBeTruthy();
    expect(screen.queryByTestId("login-screen")).toBeNull();
    expect(screen.queryByTestId("paywall-screen")).toBeNull();
  });

  it("renders shell with banner when grace", () => {
    setLicense({
      state: "grace",
      entitlements: ["overlays"],
      userId: "u",
      email: "u@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(licenseBannerMock).toHaveBeenCalled();
    expect(screen.queryByTestId("paywall-screen")).toBeNull();
  });

  it("LicenseBridge forwards Supabase access_token to license:validate", async () => {
    getSessionMock.mockResolvedValueOnce({ access_token: "bridge-tok" });
    setLicense({
      state: "active",
      entitlements: ["overlays"],
      userId: "u",
      email: "u@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    await waitFor(() => {
      expect(eventsEmit).toHaveBeenCalledWith("license:validate", {
        sessionToken: "bridge-tok",
      });
    });
  });

  it("LicenseBridge falls back to bare validate when no session", async () => {
    const refreshMock = vi.fn();
    getSessionMock.mockResolvedValueOnce(null);
    setLicense(
      {
        state: "active",
        entitlements: ["overlays"],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      false,
    );
    useLicenseMock.mockReturnValue({
      result: {
        state: "active",
        entitlements: ["overlays"],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      loading: false,
      refresh: refreshMock,
    });
    render(<HubApp />);
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("LoginScreen onLoggedIn with token re-emits license:validate", async () => {
    setLicense({
      state: "anonymous",
      entitlements: [],
      userId: "",
      email: "",
      deviceOK: true,
    });
    render(<HubApp />);
    eventsEmit.mockClear();
    screen.getByTestId("trigger-login").click();
    await waitFor(() => {
      expect(eventsEmit).toHaveBeenCalledWith("license:validate", {
        sessionToken: "tok-123",
      });
    });
  });
});