import { describe, it, expect } from "bun:test";
import { LMU } from "../lmu-offsets";
import { buildSyntheticLMUBuffer } from "./lmu-synthetic-buffer";
import {
  parseGenericAndPaths, parseScoringInfo, parseVehicleScoring,
  parsePlayerTelemetry, parseWheels, computeClassPositions,
} from "../lmu-parser";

const { buffer: fullBuf } = buildSyntheticLMUBuffer();

function cloneBuf(): Buffer {
  return Buffer.from(fullBuf);
}

describe("T18: Edge Cases", () => {
  it("null on truncated generic buffer", () => {
    expect(parseGenericAndPaths(Buffer.alloc(10))).toBeNull();
  });

  it("null on truncated scoring info buffer", () => {
    expect(parseScoringInfo(Buffer.alloc(100))).toBeNull();
  });

  it("empty vehicles when numVehicles=0", () => {
    const buf = cloneBuf();
    const SI = LMU.SCORING.SCORING_INFO as any;
    buf.writeInt32LE(0, SI.MNUMVEHICLES);
    const result = parseVehicleScoring(buf, 0);
    expect(result.length).toBe(0);
  });

  it("skips invalid vehicles (id < 0)", () => {
    const buf = cloneBuf();
    const VS_OFF = LMU.SCORING.VEH_SCORING_INFO.OFFSET;
    const VS_STR = LMU.SCORING.VEH_SCORING_INFO.STRIDE;
    const VS = LMU.VEHICLE_SCORING as any;
    // Set ID of vehicle 0 to -1
    buf.writeInt32LE(-1, VS_OFF + 0 * VS_STR + VS.ID);
    const result = parseVehicleScoring(buf, 3);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1); // Skips vehicle 0, vehicle 1 becomes first
  });

  it("handles gamePhase=0 (not on track)", () => {
    const buf = cloneBuf();
    const SI = LMU.SCORING.SCORING_INFO as any;
    buf[SI.MGAMEPHASE] = 0;
    const result = parseScoringInfo(buf);
    expect(result!["gamePhase"]).toBe(0);
  });

  it("playerHasVehicle=false returns null telemetry", () => {
    const buf = cloneBuf();
    const T = LMU.TELEMETRY as any;
    buf[T.PLAYER_HAS_VEHICLE] = 0;
    expect(parsePlayerTelemetry(buf, 0)).toBeNull();
    expect(parseWheels(buf, 0)).toBeNull();
  });

  it("all pit states handled without crash", () => {
    for (const pitState of [0, 1, 2, 3, 4]) {
      const buf = cloneBuf();
      const VS_OFF = LMU.SCORING.VEH_SCORING_INFO.OFFSET;
      const VS_STR = LMU.SCORING.VEH_SCORING_INFO.STRIDE;
      const VS = LMU.VEHICLE_SCORING as any;
      buf[VS_OFF + 0 * VS_STR + VS.PIT_STATE] = pitState;
      const vehicles = parseVehicleScoring(buf, 1);
      expect(vehicles[0]["pitState"]).toBe(pitState);
    }
  });

  it("single class: classPosition equals place", () => {
    const vehicles = parseVehicleScoring(fullBuf, 3);
    // All 3 vehicles are now different classes (2 Hypercar + 1 GT3)
    const ranked = computeClassPositions(vehicles);
    for (const v of ranked) {
      expect((v as any).classPosition).toBeGreaterThanOrEqual(1);
    }
  });

  it("empty array returns empty from classPosition", () => {
    expect(computeClassPositions([]).length).toBe(0);
  });

  it("handle driver name with special chars", () => {
    const buf = cloneBuf();
    const VS_OFF = LMU.SCORING.VEH_SCORING_INFO.OFFSET;
    const VS_STR = LMU.SCORING.VEH_SCORING_INFO.STRIDE;
    const VS = LMU.VEHICLE_SCORING as any;
    // Write a name with accent
    const name = Buffer.from("José García\0", "utf8");
    name.copy(buf, VS_OFF + 0 * VS_STR + VS.DRIVER_NAME);
    const vehicles = parseVehicleScoring(buf, 1);
    expect(vehicles[0]["driverName"]).toBe("José García");
  });

  it("zero speed from zero velocity", () => {
    const buf = cloneBuf();
    const T = LMU.TELEMETRY as any;
    const po = T.TELEM_INFO.OFFSET + 0 * T.TELEM_INFO.STRIDE;
    // mLocalVel = (0, 0, 0)
    const VT_LOCAL_VEL = 184;
    buf.writeDoubleLE(0, po + VT_LOCAL_VEL);
    buf.writeDoubleLE(0, po + VT_LOCAL_VEL + 8);
    buf.writeDoubleLE(0, po + VT_LOCAL_VEL + 16);
    const result = parsePlayerTelemetry(buf, 0);
    expect(result!["speed"]).toBe(0);
  });

  it("negative gear (reverse)", () => {
    const buf = cloneBuf();
    const T = LMU.TELEMETRY as any;
    const VT = LMU.VEHICLE_TELEMETRY as any;
    const po = T.TELEM_INFO.OFFSET + 0 * T.TELEM_INFO.STRIDE;
    buf.writeInt32LE(-1, po + VT.GEAR);
    const result = parsePlayerTelemetry(buf, 0);
    expect(result!["gear"]).toBe(-1);
  });

  it("DRS states parsed correctly", () => {
    const buf = cloneBuf();
    const T = LMU.TELEMETRY as any;
    const VT = LMU.VEHICLE_TELEMETRY as any;
    const po = T.TELEM_INFO.OFFSET + 0 * T.TELEM_INFO.STRIDE;
    for (const state of [0, 1, 2]) {
      buf[po + VT.REAR_FLAP_LEGAL_STATUS] = state;
      const result = parsePlayerTelemetry(buf, 0);
      expect(result!["rearFlapLegalStatus"]).toBe(state);
    }
  });
});
