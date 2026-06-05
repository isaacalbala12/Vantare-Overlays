/**
 * Deterministic pseudo-random number generator (Linear Congruential Generator).
 * Seeded so mock data is reproducible across runs.
 */
export class SeededRandom {
    state;
    callCount = 0;
    constructor(seed) {
        this.state = seed ?? 42;
    }
    /** Returns a value in [0, 1) */
    next() {
        this.callCount++;
        this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
        return this.state / 0x7fffffff;
    }
    /** Returns an integer in [min, max] inclusive */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    /** Returns a float in [min, max) */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
    /** Reset the generator */
    reset(seed) {
        this.state = seed ?? 42;
        this.callCount = 0;
    }
    getCallCount() {
        return this.callCount;
    }
}
//# sourceMappingURL=random.js.map