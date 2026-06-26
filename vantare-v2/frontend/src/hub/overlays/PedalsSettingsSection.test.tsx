import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { PedalsSettingsSection } from "./PedalsSettingsSection";

afterEach(() => {
  cleanup();
});

function pedalsWidget(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: "pedals",
    type: "pedals",
    enabled: true,
    updateHz: 30,
    position: { x: 40, y: 760, w: 90, h: 100 },
    ...overrides,
  };
}

function pedalsProfile(widget: WidgetConfig): ProfileConfig {
  return {
    schemaVersion: 2,
    id: "test-pedals",
    displayMode: "edit",
    monitorIndex: 0,
    widgets: [widget],
  };
}

describe("PedalsSettingsSection", () => {
  it("returns null for non-pedals widgets", () => {
    const widget: WidgetConfig = {
      id: "delta",
      type: "delta",
      enabled: true,
      position: { x: 10, y: 20, w: 100, h: 50 },
    };
    const profile = pedalsProfile(widget);
    const { container } = render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders three color pickers for throttle, brake and clutch", () => {
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={vi.fn()} />,
    );
    expect(screen.getByLabelText("Acelerador (throttle)")).toBeTruthy();
    expect(screen.getByLabelText("Freno (brake)")).toBeTruthy();
    expect(screen.getByLabelText("Embrague (clutch)")).toBeTruthy();
  });

  it("renders a fondo transparent toggle checked by default", () => {
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={vi.fn()} />,
    );
    const toggle = screen.getByRole("switch", { name: "Fondo transparente" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("does not render the background color picker when fondo is transparent", () => {
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={vi.fn()} />,
    );
    expect(screen.queryByLabelText("Color de fondo del contenedor")).toBeNull();
  });

  it("renders the background color picker when fondo personalizado is enabled", () => {
    const widget = pedalsWidget({
      props: { appearance: { backgroundColor: "#1a0104" } },
    });
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={vi.fn()} />,
    );
    const toggle = screen.getByRole("switch", { name: "Fondo transparente" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    const bgPicker = screen.getByLabelText("Color de fondo del contenedor") as HTMLInputElement;
    expect(bgPicker.value).toBe("#1a0104");
  });

  it("persists throttle color change via onChangeProfile", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const input = screen.getByLabelText("Acelerador (throttle)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#00ff00" } });
    expect(onChangeProfile).toHaveBeenCalledTimes(1);
    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].props?.appearance?.pedalThrottleColor).toBe("#00ff00");
    expect(next.widgets[0].props?.appearance?.pedalBrakeColor).toBeUndefined();
  });

  it("persists clutch color change without touching other fields", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const input = screen.getByLabelText("Embrague (clutch)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#ff0000" } });
    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].props?.appearance?.pedalClutchColor).toBe("#ff0000");
    expect(next.widgets[0].props?.appearance?.pedalThrottleColor).toBeUndefined();
    expect(next.widgets[0].props?.appearance?.pedalBrakeColor).toBeUndefined();
  });

  it("sets background to transparent when fondo toggle is turned on", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget({ props: { appearance: { backgroundColor: "#1a0104" } } });
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const toggle = screen.getByRole("switch", { name: "Fondo transparente" });
    fireEvent.click(toggle);
    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].props?.appearance?.backgroundColor).toBe("transparent");
  });

  it("sets background to the previous custom color when fondo toggle is turned off", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget({ props: { appearance: { backgroundColor: "transparent" } } });
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const toggle = screen.getByRole("switch", { name: "Fondo transparente" });
    fireEvent.click(toggle);
    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].props?.appearance?.backgroundColor).toBe("#1a0104");
  });

  it("persists custom background color via the color picker", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget({ props: { appearance: { backgroundColor: "#1a0104" } } });
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const input = screen.getByLabelText("Color de fondo del contenedor") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#00ff00" } });
    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].props?.appearance?.backgroundColor).toBe("#00ff00");
  });

  it("does not mutate the input profile", () => {
    const onChangeProfile = vi.fn();
    const widget = pedalsWidget();
    const profile = pedalsProfile(widget);
    render(
      <PedalsSettingsSection profile={profile} widget={widget} onChangeProfile={onChangeProfile} />,
    );
    const input = screen.getByLabelText("Acelerador (throttle)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#00ff00" } });
    expect(profile.widgets[0].props?.appearance?.pedalThrottleColor).toBeUndefined();
  });
});
