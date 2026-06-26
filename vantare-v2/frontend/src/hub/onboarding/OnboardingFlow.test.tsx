import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { useLicenseMock, loginScreenMock, paywallScreenMock } = vi.hoisted(
  () => ({
    useLicenseMock: vi.fn(),
    loginScreenMock: vi.fn(),
    paywallScreenMock: vi.fn(),
  }),
);

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

import { OnboardingFlow } from "./OnboardingFlow";

function setLicense(result: unknown, loading = false) {
  useLicenseMock.mockReturnValue({
    result,
    loading,
    refresh: vi.fn(),
  });
}

describe("OnboardingFlow", () => {
  beforeEach(() => {
    cleanup();
    useLicenseMock.mockReset();
    loginScreenMock.mockReset();
    paywallScreenMock.mockReset();
  });

  it("renders simulator selection on first visit", () => {
    setLicense(null, true);
    render(<OnboardingFlow />);
    expect(screen.getByTestId("onboarding-step-simulator")).toBeTruthy();
  });

  it("shows login after simulator is confirmed and session is anonymous", () => {
    setLicense(
      {
        state: "anonymous",
        entitlements: [],
        userId: "",
        email: "",
        deviceOK: true,
      },
      false,
    );
    render(<OnboardingFlow initialStep="auth" />);
    expect(loginScreenMock).toHaveBeenCalled();
  });

  it("shows paywall after simulator when session exists without entitlements", () => {
    setLicense(
      {
        state: "authenticated-no-entitlement",
        entitlements: [],
        userId: "u",
        email: "u@example.com",
        deviceOK: true,
      },
      false,
    );
    render(<OnboardingFlow initialStep="auth" />);
    expect(paywallScreenMock).toHaveBeenCalledWith("u@example.com");
  });

  it("renders recommended profile step when license is active", () => {
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
    render(<OnboardingFlow initialStep="recommended" />);
    expect(screen.getByTestId("onboarding-step-recommended")).toBeTruthy();
  });

  it("shows loading state when license is loading", () => {
    setLicense(null, true);
    render(<OnboardingFlow initialStep="auth" />);
    expect(screen.getByText(/cargando licencia/i)).toBeTruthy();
  });
});