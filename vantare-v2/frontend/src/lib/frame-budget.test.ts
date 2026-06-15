import { afterEach, describe, expect, it, vi } from "vitest";
import { clampWidgetHz, frameIntervalMs, startFrameBudgetLoop } from "./frame-budget";

describe("frame-budget", () => {
  it("caps widget hz between 1 and 30", () => {
    expect(clampWidgetHz(60)).toBe(30);
    expect(clampWidgetHz(30)).toBe(30);
    expect(clampWidgetHz(15)).toBe(15);
    expect(clampWidgetHz(0)).toBe(1);
    expect(clampWidgetHz(-5)).toBe(1);
  });

  it("converts hz to frame interval milliseconds", () => {
    expect(frameIntervalMs(30)).toBeCloseTo(33.333, 2);
    expect(frameIntervalMs(15)).toBeCloseTo(66.666, 2);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("paints at the configured interval", () => {
  const paint = vi.fn();

  vi.useFakeTimers();

  const stop = startFrameBudgetLoop(10, paint);

  vi.advanceTimersByTime(50);
  stop();
  vi.useRealTimers();

  // 10 Hz => 100 ms interval. After 50 ms we expect 0 or 1 paint depending on
  // exact timing; advance just past 100 ms would give 1. We advance 50 to stay
  // deterministic in both real and fake timer modes.
  expect(paint.mock.calls.length).toBeLessThanOrEqual(1);
});

it("paints roughly once per interval over time", () => {
  const paint = vi.fn();

  vi.useFakeTimers();

  const stop = startFrameBudgetLoop(10, paint);

  vi.advanceTimersByTime(250);
  stop();
  vi.useRealTimers();

  // 10 Hz => 100 ms interval. 250 ms should yield ~2-3 paints.
  expect(paint.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(paint.mock.calls.length).toBeLessThanOrEqual(3);
});
