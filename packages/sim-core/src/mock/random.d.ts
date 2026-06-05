/**
 * Deterministic pseudo-random number generator (Linear Congruential Generator).
 * Seeded so mock data is reproducible across runs.
 */
export declare class SeededRandom {
    private state;
    private callCount;
    constructor(seed?: number);
    /** Returns a value in [0, 1) */
    next(): number;
    /** Returns an integer in [min, max] inclusive */
    nextInt(min: number, max: number): number;
    /** Returns a float in [min, max) */
    nextFloat(min: number, max: number): number;
    /** Reset the generator */
    reset(seed?: number): void;
    getCallCount(): number;
}
//# sourceMappingURL=random.d.ts.map