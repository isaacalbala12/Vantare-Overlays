import { describe, it, expect } from 'vitest';
import {
  getCurrentSector,
  calculateSectorDelta,
  calculateBestSectors,
  calculateEstimatedLaptime,
} from '../sector';

describe('getCurrentSector', () => {
  it('returns sector 1 at start of lap', () => {
    expect(getCurrentSector(0, 5000, 3)).toBe(1);
  });

  it('returns sector 2 at one-third distance', () => {
    expect(getCurrentSector(1700, 5000, 3)).toBe(2);
  });

  it('returns sector 3 at two-thirds distance', () => {
    expect(getCurrentSector(3400, 5000, 3)).toBe(3);
  });

  it('clamps to last sector at full lap distance', () => {
    expect(getCurrentSector(5000, 5000, 3)).toBe(3);
  });

  it('handles zero track length', () => {
    expect(getCurrentSector(100, 0, 3)).toBe(1);
  });

  it('handles negative lap distance', () => {
    expect(getCurrentSector(-10, 5000, 3)).toBe(1);
  });

  it('handles 2 sector configuration', () => {
    expect(getCurrentSector(0, 4000, 2)).toBe(1);
    expect(getCurrentSector(2001, 4000, 2)).toBe(2);
  });
});

describe('calculateSectorDelta', () => {
  it('returns positive when slower than best', () => {
    expect(calculateSectorDelta(30.5, 29.8)).toBeCloseTo(0.7, 5);
  });

  it('returns negative when faster than best', () => {
    expect(calculateSectorDelta(28.5, 29.8)).toBeCloseTo(-1.3, 5);
  });

  it('returns 0 when equal', () => {
    expect(calculateSectorDelta(29.8, 29.8)).toBe(0);
  });

  it('handles zero values', () => {
    expect(calculateSectorDelta(0, 0)).toBe(0);
  });
});

describe('calculateBestSectors', () => {
  it('finds best sectors across multiple laps', () => {
    const laps: Array<[number, number, number]> = [
      [30.0, 32.0, 31.0],
      [29.5, 32.5, 30.5],
      [30.5, 31.0, 31.5],
    ];
    const result = calculateBestSectors(laps);
    expect(result[0]).toBeCloseTo(29.5, 5);
    expect(result[1]).toBeCloseTo(31.0, 5);
    expect(result[2]).toBeCloseTo(30.5, 5);
  });

  it('handles single lap', () => {
    const result = calculateBestSectors([[30.0, 32.0, 31.0]]);
    expect(result[0]).toBe(30.0);
    expect(result[1]).toBe(32.0);
    expect(result[2]).toBe(31.0);
  });

  it('handles empty array', () => {
    const result = calculateBestSectors([]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
  });

  it('handles zero sector times', () => {
    const laps: Array<[number, number, number]> = [
      [0, 30.0, 0],
      [29.0, 0, 31.0],
    ];
    const result = calculateBestSectors(laps);
    expect(result[0]).toBeCloseTo(29.0, 5);
    expect(result[1]).toBeCloseTo(30.0, 5);
    expect(result[2]).toBeCloseTo(31.0, 5);
  });
});

describe('calculateEstimatedLaptime', () => {
  it('returns last lap time on first sector', () => {
    expect(calculateEstimatedLaptime(1, [], 90.0)).toBeCloseTo(90.0, 5);
  });

  it('estimates based on completed sectors', () => {
    expect(calculateEstimatedLaptime(3, [30.0, 32.0], 90.0)).toBeCloseTo(92.0, 5);
  });

  it('estimates with only sector 1 completed', () => {
    expect(calculateEstimatedLaptime(2, [28.5], 90.0)).toBeCloseTo(28.5 + 2 * (90.0 / 3), 5);
  });

  it('returns last lap time with no completed sectors but currentSector > 1', () => {
    expect(calculateEstimatedLaptime(2, [], 90.0)).toBeCloseTo(90.0, 5);
  });

  it('handles zero last lap time', () => {
    expect(calculateEstimatedLaptime(1, [], 0)).toBe(0);
  });

  it('handles zero current sector', () => {
    expect(calculateEstimatedLaptime(0, [], 90.0)).toBeCloseTo(90.0, 5);
  });
});
