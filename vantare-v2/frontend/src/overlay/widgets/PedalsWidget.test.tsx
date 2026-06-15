import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PedalsWidget } from "./PedalsWidget";

describe("PedalsWidget", () => {
  it("renders gear block and pedal labels in edit mode", () => {
    render(
      <PedalsWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText("THR")).toBeTruthy();
    expect(screen.getByText("BRK")).toBeTruthy();
    expect(screen.getByText("CLU")).toBeTruthy();
  });

  it("renders with custom accent color", () => {
    const { container } = render(
      <PedalsWidget editMode={true} updateHz={30} props={{ appearance: { accentColor: "#ff0000" } }} />,
    );
    const gearBlock = container.querySelector("[data-testid='pedals-gear']") as HTMLElement;
    expect(gearBlock).toBeTruthy();
  });
});
