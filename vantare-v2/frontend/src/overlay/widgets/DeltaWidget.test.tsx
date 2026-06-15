import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeltaWidget, formatDelta } from "./DeltaWidget";


describe("DeltaWidget", () => {
  it("renders delta value and target info in edit mode", () => {
    render(
      <DeltaWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText(/Target/)).toBeTruthy();
    expect(screen.getByText(/Lap/)).toBeTruthy();
  });

  it("formats positive and negative backend delta values", () => {
    expect(formatDelta(1.234)).toBe("+1.234s");
    expect(formatDelta(-0.456)).toBe("-0.456s");
    expect(formatDelta(0)).toBe("—");
  });
});
