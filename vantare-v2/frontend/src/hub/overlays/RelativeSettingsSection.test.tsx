import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileConfig } from "../../lib/profile";
import { RelativeSettingsSection } from "./RelativeSettingsSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function profile(): ProfileConfig {
  return {
    schemaVersion: 2,
    id: "v2",
    displayMode: "edit",
    monitorIndex: 0,
    widgets: [
      {
        id: "relative",
        type: "relative",
        variantId: "variant-relative-default",
        enabled: true,
        position: { x: 40, y: 600, w: 320, h: 280 },
      },
    ],
    variants: [
      {
        id: "variant-relative-default",
        widgetType: "relative",
        templateId: "relative-vantare-default",
        columns: [
          { id: "position", metricId: "position", enabled: true },
          { id: "class", metricId: "class", enabled: true },
          { id: "carNumber", metricId: "carNumber", enabled: true },
          { id: "driverName", metricId: "driverName", enabled: true },
          { id: "gap", metricId: "gap", enabled: true },
          { id: "bestLap", metricId: "bestLap", enabled: false },
          { id: "lastLap", metricId: "lastLap", enabled: false },
        ],
      },
    ],
  };
}

describe("RelativeSettingsSection", () => {
  it("toggles best lap column in the variant", () => {
    const onChangeProfile = vi.fn();
    const p = profile();

    render(
      <RelativeSettingsSection
        profile={p}
        widget={p.widgets[0]}
        onChangeProfile={onChangeProfile}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Mostrar mejor vuelta" }));

    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.widgets[0].position).toEqual(p.widgets[0].position);
    expect(next.variants?.[0].columns?.find((column) => column.id === "bestLap")?.enabled).toBe(true);
  });

  it("toggles last lap column in the variant", () => {
    const onChangeProfile = vi.fn();
    const p = profile();

    render(
      <RelativeSettingsSection
        profile={p}
        widget={p.widgets[0]}
        onChangeProfile={onChangeProfile}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Mostrar última vuelta" }));

    const next = onChangeProfile.mock.calls[0][0] as ProfileConfig;
    expect(next.variants?.[0].columns?.find((column) => column.id === "lastLap")?.enabled).toBe(true);
  });

  it("does not render for non-relative widgets", () => {
    const p = profile();
    const widget = { ...p.widgets[0], id: "delta", type: "delta" };

    const { container } = render(
      <RelativeSettingsSection profile={p} widget={widget} onChangeProfile={vi.fn()} />,
    );

    expect(container.textContent).toBe("");
  });
});
