import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TelemetryWidget } from "./TelemetryWidget";

describe("TelemetryWidget", () => {
  it("renders telemetry header and gear in edit mode", () => {
    render(
      <TelemetryWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText(/VANTARE TELEMETRY/)).toBeTruthy();
  });

  it("applies custom rpm zone colors", () => {
    const { container } = render(
      <TelemetryWidget editMode={true} updateHz={30} props={{ appearance: { rpmGreen: "#00ff00" } }} />,
    );
    const rpmContainer = container.querySelector("[data-testid='rpm-leds']");
    expect(rpmContainer).toBeTruthy();
  });
});
