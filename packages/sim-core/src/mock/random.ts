/**
 * Deterministic pseudo-random number generator (Linear Congruential Generator).
 * Seeded so mock data is reproducible across runs.
 */
export class SeededRandom {
  private state: number;
  private callCount = 0;

  constructor(seed?: number) {
    this.state = seed ?? 42;
  }

  /** Returns a value in [0, 1) */
  next(): number {
    this.callCount++;
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Reset the generator */
  reset(seed?: number): void {
    this.state = seed ?? 42;
    this.callCount = 0;
  }

  getCallCount(): number {
    return this.callCount;
  }
}
