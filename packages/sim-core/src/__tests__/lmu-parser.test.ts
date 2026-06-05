import { describe, it, expect } from "bun:test";
import { buildSyntheticLMUBuffer } from "./lmu-synthetic-buffer";
import { LMU } from "../lmu-offsets";
import {
  parseGenericAndPaths, parseScoringInfo, parseVehicleScoring,
  computeClassPositions, parsePlayerTelemetry, parseWheels,
} from "../lmu-parser";

const { buffer } = buildSyntheticLMUBuffer();

function cloneAndModifyBuffer(fieldOffsets: number[], newValue: number): Buffer {
  const b = Buffer.from(buffer);
  for (const off of fieldOffsets) {
    if (off >= 0 && off < b.length) b[off] = newValue;
  }
  return b;
}

describe("T5: LMUGeneric + LMUPathData", () => {
  it("parses game version", () => {
    const result = parseGenericAndPaths(buffer);
    expect(result).not.toBeNull();
    expect(result!["gameVersion"]).toBe(12345);
  });

  it("parses FFBTorque", () => {
    const result = parseGenericAndPaths(buffer);
    expect(result!["ffbTorque"]).toBeCloseTo(0.5, 3);
  });

  it("returns null on small buffer", () => {
    const result = parseGenericAndPaths(Buffer.alloc(10));
    expect(result).toBeNull();
  });
});

describe("T6: LMUScoringInfo", () => {
  it("parses track name", () => {
    const result = parseScoringInfo(buffer);
    expect(result).not.toBeNull();
    expect(result!["trackName"]).toBe("Spa");
  });

  it("parses session and phase", () => {
    const result = parseScoringInfo(buffer);
    expect(result!["sessionType"]).toBe(10);
    expect(result!["gamePhase"]).toBe(5);
    expect(result!["numVehicles"]).toBe(3);
  });

  it("parses weather", () => {
    const result = parseScoringInfo(buffer);
    expect(result!["ambientTemp"]).toBeCloseTo(25, 1);
    expect(result!["trackTemp"]).toBeCloseTo(38, 1);
  });
});

describe("T7: LMUVehicleScoring", () => {
  it("parses all 3 vehicles", () => {
    const vehicles = parseVehicleScoring(buffer, 3);
    expect(vehicles.length).toBe(3);
  });

  it("finds player vehicle", () => {
    const vehicles = parseVehicleScoring(buffer, 3);
    const player = vehicles.find((v: any) => v.isPlayer);
    expect(player).toBeDefined();
    expect((player as any).driverName).toBe("TestDriver");
    expect((player as any).place).toBe(1);
    expect((player as any).vehicleClass).toBe("Hypercar");
  });

  it("returns empty for count 0", () => {
    expect(parseVehicleScoring(buffer, 0).length).toBe(0);
  });
});

describe("T8: classPosition", () => {
  it("groups and ranks by class", () => {
    const vehicles = parseVehicleScoring(buffer, 3);
    const ranked = computeClassPositions(vehicles);
    const hypercars = ranked.filter((v: any) => v.vehicleClass === "Hypercar");
    expect((hypercars[0] as any).classPosition).toBe(1);
    expect((hypercars[1] as any).classPosition).toBe(2);
  });
});

describe("T9: LMUVehicleTelemetry", () => {
  it("parses player telemetry", () => {
    const result = parsePlayerTelemetry(buffer, 0);
    expect(result).not.toBeNull();
    expect(result!["speed"]).toBeCloseTo(15, 5);
    expect(result!["gear"]).toBe(4);
    expect(result!["engineRpm"]).toBe(7200);
    expect(result!["fuel"]).toBeCloseTo(45.2, 1);
  });

  it("returns null when playerHasVehicle=0", () => {
    const T = LMU.TELEMETRY as any;
    const modified = cloneAndModifyBuffer([T.PLAYER_HAS_VEHICLE], 0);
    const result = parsePlayerTelemetry(modified, 0);
    expect(result).toBeNull();
  });
});

describe("T10: LMUWheel", () => {
  it("parses 4 wheels", () => {
    const wheels = parseWheels(buffer, 0);
    expect(wheels).not.toBeNull();
    expect(wheels!.length).toBe(4);
  });

  it("wheel 0 has correct data", () => {
    const wheels = parseWheels(buffer, 0)!;
    expect(wheels[0]["brakeTemp"]).toBe(100);
    expect((wheels[0] as any).pressure).toBeCloseTo(24, 1);
    expect((wheels[0] as any).wear).toBeCloseTo(0.3, 1);
  });

  it("returns null when playerHasVehicle=0", () => {
    const T = LMU.TELEMETRY as any;
    const modified = cloneAndModifyBuffer([T.PLAYER_HAS_VEHICLE], 0);
    const result = parseWheels(modified, 0);
    expect(result).toBeNull();
  });
});
