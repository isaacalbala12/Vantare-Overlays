import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TelemetryVerticalWidget } from "./TelemetryVerticalWidget";

describe("TelemetryVerticalWidget", () => {
  it("renders vertical layout with gear and pedals in edit mode", () => {
    render(
      <TelemetryVerticalWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText("VANTARE TEL")).toBeTruthy();
  });
});
