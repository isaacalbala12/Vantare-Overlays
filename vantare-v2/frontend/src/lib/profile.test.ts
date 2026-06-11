import { describe, expect, it } from "vitest";
import { toWindowLocal } from "./profile";

describe("toWindowLocal", () => {
  it("subtracts origin from widget position", () => {
    const result = toWindowLocal(
      { x: 100, y: 200, w: 400, h: 48 },
      { x: 32, y: 192 },
    );
    expect(result).toEqual({ x: 68, y: 8, w: 400, h: 48 });
  });

  it("returns zero when widget is at origin", () => {
    const result = toWindowLocal(
      { x: 50, y: 60, w: 100, h: 50 },
      { x: 50, y: 60 },
    );
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it("handles negative offset (widget left of origin)", () => {
    const result = toWindowLocal(
      { x: 10, y: 20, w: 50, h: 30 },
      { x: 100, y: 100 },
    );
    expect(result).toEqual({ x: -90, y: -80, w: 50, h: 30 });
  });
});
