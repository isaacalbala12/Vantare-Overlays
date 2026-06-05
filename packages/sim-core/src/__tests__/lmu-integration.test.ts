import { describe, it, expect } from "bun:test";
import { buildSyntheticLMUBuffer, extractScoringInfo, extractPlayerTelemetry, extractWheelTemp, extractVehicleAt } from "./lmu-synthetic-buffer";
import { parseLMUObjectOut, parseScoringInfo, parseVehicleScoring, parsePlayerTelemetry, parseWheels, computeClassPositions } from "../lmu-parser";
import { LMU } from "../lmu-offsets";

describe("T16: Integration - Synthetic Buffer Roundtrip", () => {
  const { buffer, expected } = buildSyntheticLMUBuffer();

  it("full parseLMUObjectOut returns correct structure", () => {
    const result = parseLMUObjectOut(buffer);
    expect(result).not.toBeNull();
    expect(result!.session).not.toBeNull();
    expect(result!.playerTelemetry).not.toBeNull();
    expect(result!.vehicles.length).toBe(3);
    expect(result!.wheels!.length).toBe(4);
    expect(result!.generic).not.toBeNull();
  });

  it("scoring info matches expected", () => {
    const si = parseScoringInfo(buffer);
    expect(si!["trackName"]).toBe(expected.trackName);
    expect(si!["numVehicles"]).toBe(expected.numVehicles);
  });

  it("player telemetry matches expected", () => {
    const pt = parsePlayerTelemetry(buffer, 0);
    expect(pt!["speed"]).toBeCloseTo(expected.playerSpeed, 5);
    expect(pt!["gear"]).toBe(expected.playerGear);
    expect(pt!["engineRpm"]).toBe(expected.playerRpm);
  });

  it("vehicle scoring has class positions", () => {
    const vehicles = parseVehicleScoring(buffer, 3);
    const ranked = computeClassPositions(vehicles);
    expect((ranked[0] as any).classPosition).toBe(1);
    expect((ranked[2] as any).classPosition).toBe(1); // GT3 is alone in its class
  });

  it("wheels parsed for player vehicle", () => {
    const wheels = parseWheels(buffer, 0);
    expect(wheels).not.toBeNull();
    expect(wheels![0]["brakeTemp"]).toBe(expected.wheelTemp0);
  });

  it("extraction helpers match parser output", () => {
    const si1 = extractScoringInfo(buffer);
    const si2 = parseScoringInfo(buffer);
    expect(si1.trackName).toBe(si2!["trackName"]);
    expect(si1.session).toBe(si2!["sessionType"]);

    const pt1 = extractPlayerTelemetry(buffer);
    const pt2 = parsePlayerTelemetry(buffer, 0);
    expect(pt1.speed).toBeCloseTo(pt2!["speed"] as number, 5);
    expect(pt1.gear).toBe(pt2!["gear"]);
  });

  it("parser output is deterministic (same buffer = same result)", () => {
    const r1 = parseLMUObjectOut(buffer);
    const r2 = parseLMUObjectOut(buffer);
    expect(r1!.session!["trackName"]).toBe(r2!.session!["trackName"]);
    expect(r1!.playerTelemetry!["speed"]).toBe(r2!.playerTelemetry!["speed"]);
    expect(r1!.vehicles.length).toBe(r2!.vehicles.length);
  });
});
