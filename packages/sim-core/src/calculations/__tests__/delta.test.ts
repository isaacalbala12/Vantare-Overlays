import { describe, it, expect } from 'vitest';
import {
  calculateDeltaToBest,
  calculateDeltaToLeader,
  calculateDeltaToCar,
  calculateDeltaSector,
} from '../delta';

describe('calculateDeltaToBest', () => {
  it('returns positive delta when slower than best', () => {
    expect(calculateDeltaToBest(95.5, 93.2)).toBeCloseTo(2.3, 5);
  });

  it('returns negative delta when faster than best', () => {
    expect(calculateDeltaToBest(91.0, 93.2)).toBeCloseTo(-2.2, 5);
  });

  it('returns 0 when equal to best', () => {
    expect(calculateDeltaToBest(93.2, 93.2)).toBe(0);
  });

  it('handles extreme values', () => {
    expect(calculateDeltaToBest(999.999, 60.0)).toBeCloseTo(939.999, 3);
  });

  it('handles NaN lapTime', () => {
    expect(calculateDeltaToBest(NaN, 93.2)).toBeNaN();
  });
});

describe('calculateDeltaToLeader', () => {
  it('calculates delta when on same lap', () => {
    const result = calculateDeltaToLeader(95.5, 93.2, 0);
    expect(result).toBeCloseTo(2.3, 5);
  });

  it('accounts for laps down', () => {
    const result = calculateDeltaToLeader(95.5, 93.2, 2);
    expect(result).toBeCloseTo(2.3 + 2 * 93.2, 5);
  });

  it('returns negative when faster than leader on same lap', () => {
    expect(calculateDeltaToLeader(91.0, 93.2, 0)).toBeCloseTo(-2.2, 5);
  });

  it('handles zero leader lap time', () => {
    expect(calculateDeltaToLeader(95.5, 0, 1)).toBe(95.5);
  });

  it('handles NaN inputs', () => {
    expect(calculateDeltaToLeader(NaN, 93.2, 0)).toBeNaN();
  });
});

describe('calculateDeltaToCar', () => {
  it('returns positive when slower than other car', () => {
    expect(calculateDeltaToCar(95.5, 93.2)).toBeCloseTo(2.3, 5);
  });

  it('returns negative when faster than other car', () => {
    expect(calculateDeltaToCar(91.0, 93.2)).toBeCloseTo(-2.2, 5);
  });

  it('returns 0 when equal', () => {
    expect(calculateDeltaToCar(93.2, 93.2)).toBe(0);
  });

  it('handles NaN', () => {
    expect(calculateDeltaToCar(NaN, 93.2)).toBeNaN();
  });
});

describe('calculateDeltaSector', () => {
  it('returns positive delta when slower than best sector', () => {
    expect(calculateDeltaSector(30.5, 29.8)).toBeCloseTo(0.7, 5);
  });

  it('returns negative delta when faster than best', () => {
    expect(calculateDeltaSector(28.5, 29.8)).toBeCloseTo(-1.3, 5);
  });

  it('returns 0 when equal to best', () => {
    expect(calculateDeltaSector(29.8, 29.8)).toBe(0);
  });

  it('handles zero values', () => {
    expect(calculateDeltaSector(0, 0)).toBe(0);
  });
});
