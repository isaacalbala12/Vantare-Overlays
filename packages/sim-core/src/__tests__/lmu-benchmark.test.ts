import { describe, it, expect } from "bun:test";
import { buildSyntheticLMUBuffer } from "./lmu-synthetic-buffer";
import { parseLMUObjectOut } from "../lmu-parser";

const { buffer } = buildSyntheticLMUBuffer();

describe("T19: Performance Benchmark", () => {
  it("parses 324KB buffer in under 5ms per call", () => {
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = parseLMUObjectOut(buffer);
      expect(result).not.toBeNull();
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;
    console.log(`Benchmark: ${iterations} iterations, ${elapsed.toFixed(1)}ms total, ${avgMs.toFixed(3)}ms avg`);
    expect(avgMs).toBeLessThan(5);
  });

  it("returns null for empty buffer", () => {
    const result = parseLMUObjectOut(Buffer.alloc(10));
    expect(result).toBeNull();
  });

  it("returns null for undersized buffer", () => {
    const result = parseLMUObjectOut(Buffer.alloc(1000));
    expect(result).toBeNull();
  });
});
