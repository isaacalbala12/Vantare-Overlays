import { describe, it, expect } from "vitest";
import {
  calculateGapSeconds,
  calculateGapLaps,
  calculateClassGap,
  formatGap,
} from "../gap";

describe("calculateGapSeconds", () => {
  it("calculates gap in seconds from distance", () => {
    expect(calculateGapSeconds(100, 200, 50)).toBeCloseTo(2, 5);
  });

  it("returns 0 when at same distance", () => {
    expect(calculateGapSeconds(100, 100, 50)).toBe(0);
  });

  it("handles player ahead (negative gap)", () => {
    expect(calculateGapSeconds(300, 100, 50)).toBeCloseTo(-4, 5);
  });

  it("handles zero speed", () => {
    expect(calculateGapSeconds(100, 200, 0)).toBe(0);
  });

  it("handles NaN distances", () => {
    expect(calculateGapSeconds(NaN, 200, 50)).toBeNaN();
  });
});

describe("calculateGapLaps", () => {
  it("calculates lap gap when behind", () => {
    expect(calculateGapLaps(5, 8)).toBe(3);
  });

  it("returns 0 when on same lap", () => {
    expect(calculateGapLaps(5, 5)).toBe(0);
  });

  it("returns negative when ahead", () => {
    expect(calculateGapLaps(8, 5)).toBe(-3);
  });

  it("handles zero laps", () => {
    expect(calculateGapLaps(0, 0)).toBe(0);
  });

  it("handles negative values", () => {
    expect(calculateGapLaps(5, 3)).toBe(-2);
  });
});

describe("calculateClassGap", () => {
  it("returns 0 for class leader", () => {
    expect(calculateClassGap(1, 10, 15.5)).toBe(0);
  });

  it("calculates proportional gap for mid-pack", () => {
    const result = calculateClassGap(3, 10, 20);
    expect(result).toBeCloseTo(20 * (2 / 9), 5);
  });

  it("returns gap for last position", () => {
    expect(calculateClassGap(10, 10, 15.5)).toBeCloseTo(15.5, 5);
  });

  it("handles single car class", () => {
    expect(calculateClassGap(1, 1, 10)).toBe(0);
  });

  it("handles zero class leader gap", () => {
    expect(calculateClassGap(5, 10, 0)).toBe(0);
  });
});

describe("formatGap", () => {
  it("formats positive seconds gap", () => {
    expect(formatGap(1.234)).toBe("+1.234");
  });

  it("formats negative seconds gap", () => {
    expect(formatGap(-0.567)).toBe("-0.567");
  });

  it("formats zero gap", () => {
    expect(formatGap(0)).toBe("+0.000");
  });

  it("formats large gap as laps", () => {
    expect(formatGap(3600)).toBe("+1 LAP");
    expect(formatGap(7200)).toBe("+2 LAPS");
  });

  it("handles threshold boundary", () => {
    expect(formatGap(3599.999)).toBe("+3599.999");
    expect(formatGap(3600)).toBe("+1 LAP");
  });

  it("formats negative large gap as laps", () => {
    expect(formatGap(-3600)).toBe("-1 LAP");
  });
});
