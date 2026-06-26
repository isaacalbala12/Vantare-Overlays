import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const {
  useLicenseMock,
  loginScreenMock,
  paywallScreenMock,
  licenseBannerMock,
} = vi.hoisted(() => ({
  useLicenseMock: vi.fn(),
  loginScreenMock: vi.fn(),
  paywallScreenMock: vi.fn(),
  licenseBannerMock: vi.fn(),
}));

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => () => {}),
    Off: vi.fn(),
    Emit: vi.fn(),
  },
}));

vi.mock("../../lib/license", () => ({
  LicenseProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLicense: useLicenseMock,
}));

vi.mock("../../lib/supabase-auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("../auth/LoginScreen", () => ({
  LoginScreen: () => {
    loginScreenMock();
    return <div data-testid="login-screen">login</div>;
  },
}));

vi.mock("../auth/PaywallScreen", () => ({
  PaywallScreen: ({ email }: { email: string }) => {
    paywallScreenMock(email);
    return <div data-testid="paywall-screen">paywall {email}</div>;
  },
}));

vi.mock("../auth/LicenseBanner", () => ({
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

describe("HubApp route gating", () => {
  beforeEach(() => {
    cleanup();
    useLicenseMock.mockReset();
    loginScreenMock.mockReset();
    paywallScreenMock.mockReset();
    licenseBannerMock.mockReset();
  });

  it("shows loading state while license is loading", () => {
    setLicense(null, true);
    render(<HubApp />);
    expect(screen.getByText(/cargando licencia/i)).toBeTruthy();
    expect(loginScreenMock).not.toHaveBeenCalled();
    expect(paywallScreenMock).not.toHaveBeenCalled();
  });

  it("shows login screen when anonymous", () => {
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
  });

  it("shows paywall screen when authenticated-no-entitlement", () => {
    setLicense({
      state: "authenticated-no-entitlement",
      entitlements: [],
      userId: "u",
      email: "isaac@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(paywallScreenMock).toHaveBeenCalledWith("isaac@example.com");
    expect(screen.getByTestId("paywall-screen")).toBeTruthy();
  });

  it("shows paywall when expired", () => {
    setLicense({
      state: "expired",
      entitlements: [],
      userId: "u",
      email: "exp@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(paywallScreenMock).toHaveBeenCalledWith("exp@example.com");
  });

  it("shows paywall when device-limit", () => {
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

  it("renders banner + dashboard when active", () => {
    setLicense({
      state: "active",
      entitlements: ["overlays"],
      userId: "u",
      email: "active@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(licenseBannerMock).toHaveBeenCalled();
    expect(screen.getByTestId("license-banner")).toBeTruthy();
    expect(screen.queryByTestId("login-screen")).toBeNull();
    expect(screen.queryByTestId("paywall-screen")).toBeNull();
  });

  it("renders banner + dashboard when grace", () => {
    setLicense({
      state: "grace",
      entitlements: ["overlays"],
      userId: "u",
      email: "grace@example.com",
      deviceOK: true,
    });
    render(<HubApp />);
    expect(licenseBannerMock).toHaveBeenCalled();
    expect(screen.queryByTestId("login-screen")).toBeNull();
    expect(screen.queryByTestId("paywall-screen")).toBeNull();
  });

  it("falls back to login when result is null after loading", () => {
    setLicense(null, false);
    render(<HubApp />);
    expect(loginScreenMock).toHaveBeenCalled();
  });
});