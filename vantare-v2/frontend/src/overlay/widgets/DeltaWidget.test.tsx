import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeltaWidget } from "./DeltaWidget";

describe("DeltaWidget", () => {
  it("renders delta value and target info in edit mode", () => {
    render(
      <DeltaWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText(/Target/)).toBeTruthy();
    expect(screen.getByText(/Lap/)).toBeTruthy();
  });
});
