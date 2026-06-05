import { describe, it, expect } from 'vitest';
import {
  calculateFuelPerLap,
  calculateLapsRemaining,
  calculateFuelToEnd,
  calculateRecommendedFuelSave,
  calculateStintLength,
} from '../fuel';

describe('calculateFuelPerLap', () => {
  it('calculates average fuel consumption per lap', () => {
    expect(calculateFuelPerLap(10, 5)).toBe(2);
  });

  it('returns 0 when no laps completed', () => {
    expect(calculateFuelPerLap(0, 0)).toBe(0);
    expect(calculateFuelPerLap(5, 0)).toBe(0);
  });

  it('handles fractional consumption', () => {
    expect(calculateFuelPerLap(7.5, 3)).toBeCloseTo(2.5, 5);
  });

  it('handles negative fuel used as zero', () => {
    expect(calculateFuelPerLap(-5, 3)).toBe(0);
  });

  it('returns NaN for NaN inputs', () => {
    expect(calculateFuelPerLap(NaN, 3)).toBeNaN();
    expect(calculateFuelPerLap(10, NaN)).toBeNaN();
  });
});

describe('calculateLapsRemaining', () => {
  it('calculates laps with current fuel', () => {
    expect(calculateLapsRemaining(50, 2.5)).toBe(20);
  });

  it('returns 0 when fuel per lap is 0', () => {
    expect(calculateLapsRemaining(50, 0)).toBe(0);
  });

  it('handles insufficient fuel', () => {
    expect(calculateLapsRemaining(1, 5)).toBe(0.2);
  });

  it('handles zero fuel', () => {
    expect(calculateLapsRemaining(0, 2.5)).toBe(0);
  });

  it('handles negative fuel level as zero', () => {
    expect(calculateLapsRemaining(-10, 2.5)).toBe(0);
  });
});

describe('calculateFuelToEnd', () => {
  it('calculates fuel needed to finish', () => {
    expect(calculateFuelToEnd(20, 2.5, 10)).toBe(5);
  });

  it('returns 0 when enough fuel', () => {
    expect(calculateFuelToEnd(30, 2.5, 10)).toBe(0);
  });

  it('handles zero laps remaining', () => {
    expect(calculateFuelToEnd(10, 2.5, 0)).toBe(0);
  });

  it('handles zero fuel per lap', () => {
    expect(calculateFuelToEnd(10, 0, 5)).toBe(0);
  });
});

describe('calculateRecommendedFuelSave', () => {
  it('returns negative when fuel save needed', () => {
    const result = calculateRecommendedFuelSave(10, 3, 5);
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(-1, 5);
  });

  it('returns positive when fuel surplus', () => {
    const result = calculateRecommendedFuelSave(20, 3, 5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(1, 5);
  });

  it('returns 0 when fuel is exactly enough', () => {
    const result = calculateRecommendedFuelSave(15, 3, 5);
    expect(result).toBe(0);
  });

  it('handles zero laps remaining', () => {
    expect(calculateRecommendedFuelSave(10, 3, 0)).toBe(0);
  });

  it('handles zero fuel level', () => {
    expect(calculateRecommendedFuelSave(0, 3, 5)).toBe(-3);
  });
});

describe('calculateStintLength', () => {
  it('calculates max stint laps', () => {
    expect(calculateStintLength(100, 2.5)).toBe(40);
  });

  it('returns 0 when fuel per lap is 0', () => {
    expect(calculateStintLength(100, 0)).toBe(0);
  });

  it('handles zero fuel capacity', () => {
    expect(calculateStintLength(0, 2.5)).toBe(0);
  });

  it('handles fractional result', () => {
    expect(calculateStintLength(95, 4.2)).toBeCloseTo(22.619, 2);
  });
});
