import { LMU, LMU_OBJECT_OUT_SIZE } from "./lmu-offsets";


// ─── Helper: read null-terminated UTF-8 string ───
function readStr(buf: Buffer, off: number, max: number): string {
  if (off >= buf.length) return "";
  const end = Math.min(off + max, buf.length);
  const slice = buf.subarray(off, end);
  const nullIdx = slice.indexOf(0);
  const str = nullIdx >= 0 ? slice.subarray(0, nullIdx) : slice;
  return str.toString("utf8").replace(/[\x00-\x1f]/g, "").trim();
}

// ─── T5: LMUGeneric + LMUPathData ───
export function parseGenericAndPaths(buf: Buffer): Record<string, unknown> | null {
  if (buf.length < LMU.GENERIC.OFFSET + LMU.GENERIC.SIZE) return null;

  const genOff = LMU.GENERIC.OFFSET;
  const result: Record<string, unknown> = {};

  // Game version (int32)
  result["gameVersion"] = buf.readInt32LE(genOff + LMU.GENERIC.GAME_VERSION);

  // FFB torque (float)
  result["ffbTorque"] = buf.readFloatLE(genOff + LMU.GENERIC.FFB_TORQUE);

  // Paths
  const pathsOff = LMU.PATHS.OFFSET;
  result["userData"] = readStr(buf, pathsOff, 260);
  result["customVariables"] = readStr(buf, pathsOff + 260, 260);
  result["stewardResults"] = readStr(buf, pathsOff + 520, 260);
  result["playerProfile"] = readStr(buf, pathsOff + 780, 260);
  result["pluginsFolder"] = readStr(buf, pathsOff + 1040, 260);

  // Events - check if SME_UPDATE_SCORING or SME_UPDATE_TELEMETRY flags are set
  const scoringEvent = buf.readUInt32LE(genOff + LMU.GENERIC.EVENT_SME_UPDATE_SCORING);
  const telemetryEvent = buf.readUInt32LE(genOff + LMU.GENERIC.EVENT_SME_UPDATE_TELEMETRY);
  result["scoringUpdated"] = scoringEvent !== 0;
  result["telemetryUpdated"] = telemetryEvent !== 0;

  return result;
}

// ─── T6: LMUScoringInfo (session) ───
export function parseScoringInfo(buf: Buffer): Record<string, unknown> | null {
  const SI = LMU.SCORING.SCORING_INFO as any;
  if (buf.length < SI.OFFSET + SI.SIZE) return null;

  const result: Record<string, unknown> = {};
  result["trackName"] = readStr(buf, SI.MTRACKNAME.OFFSET, 64);
  result["sessionType"] = buf.readInt32LE(SI.MSESSION);
  result["sessionTime"] = buf.readDoubleLE(SI.MCURRENTET);
  result["sessionTimeRemain"] = buf.readFloatLE(SI.MSESSIONTIMEREMAINING);
  result["totalLaps"] = buf.readInt32LE(SI.MMAXLAPS);
  result["trackLength"] = buf.readDoubleLE(SI.MLAPDIST);
  result["numVehicles"] = buf.readInt32LE(SI.MNUMVEHICLES);
  result["gamePhase"] = buf[SI.MGAMEPHASE];
  result["ambientTemp"] = buf.readDoubleLE(SI.MAMBIENTTEMP);
  result["trackTemp"] = buf.readDoubleLE(SI.MTRACKTEMP);
  result["raining"] = buf.readDoubleLE(SI.MRAINING);
  result["trackGripLevel"] = buf[SI.MTRACKGRIPLEVEL];
  result["cloudCoverage"] = buf[SI.MCLOUDCOVERAGE];
  result["playerName"] = readStr(buf, SI.MPLAYERNAME.OFFSET, 32);

  return result;
}

// ─── T7: LMUVehicleScoring ───
export function parseVehicleScoring(buf: Buffer, count: number): Record<string, unknown>[] {
  const VS_INFO = LMU.SCORING.VEH_SCORING_INFO;
  const VS_OFF = VS_INFO.OFFSET;
  const VS_STR = VS_INFO.STRIDE;
  const VS = LMU.VEHICLE_SCORING as any;

  const maxCount = Math.min(count, 104);
  const vehicles: Record<string, unknown>[] = [];

  for (let i = 0; i < maxCount; i++) {
    const off = VS_OFF + i * VS_STR;

    const id = buf.readInt32LE(off + VS.ID);
    const name = readStr(buf, off + VS.DRIVER_NAME, 32);

    // Skip invalid entries (sentinel check)
    if (id < 0 || name === "") continue;

    const v: Record<string, unknown> = {
      id,
      driverName: name,
      vehicleName: readStr(buf, off + VS.VEHICLE_NAME, 64),
      totalLaps: buf.readInt16LE(off + VS.TOTAL_LAPS),
      sector: buf.readInt8(off + VS.SECTOR),
      finishStatus: buf.readInt8(off + VS.FINISH_STATUS),
      lapDist: buf.readDoubleLE(off + VS.LAP_DIST),
      bestLapTime: buf.readDoubleLE(off + VS.BEST_LAP_TIME),
      lastLapTime: buf.readDoubleLE(off + VS.LAST_LAP_TIME),
      curSector1: buf.readDoubleLE(off + VS.CUR_SECTOR1),
      curSector2: buf.readDoubleLE(off + VS.CUR_SECTOR2),
      numPitstops: buf.readInt16LE(off + VS.NUM_PITSTOPS),
      numPenalties: buf.readInt16LE(off + VS.NUM_PENALTIES),
      isPlayer: buf[off + VS.IS_PLAYER] !== 0,
      inPits: buf[off + VS.IN_PITS] !== 0,
      place: buf[off + VS.PLACE],
      vehicleClass: readStr(buf, off + VS.VEHICLE_CLASS, 32),
      pitState: buf[off + VS.PIT_STATE],
      qualification: buf.readInt32LE(off + VS.QUALIFICATION),
      estimatedLapTime: buf.readDoubleLE(off + VS.ESTIMATED_LAP_TIME),
      pitGroup: readStr(buf, off + VS.PIT_GROUP, 24),
      flag: buf[off + VS.FLAG],
      fuelFraction: buf[off + VS.FUEL_FRACTION],
      drsState: buf[off + VS.DRS_STATE] !== 0,
      steamId: buf.readBigUInt64LE(off + VS.STEAM_ID),
      // Gap fields if available
    };

    // Optional gap fields
    if (off + VS.TIME_BEHIND_NEXT + 8 <= buf.length) {
      const gapNext = buf.readDoubleLE(off + VS.TIME_BEHIND_NEXT);
      const gapLeader = buf.readDoubleLE(off + VS.TIME_BEHIND_LEADER);
      v["timeBehindNext"] = gapNext;
      v["timeBehindLeader"] = gapLeader;
      v["lapsBehindLeader"] = buf.readInt32LE(off + VS.LAPS_BEHIND_LEADER);
    }

    vehicles.push(v);
  }

  return vehicles;
}

// ─── T8: classPosition computation ───
export function computeClassPositions(vehicles: Record<string, unknown>[]): Record<string, unknown>[] {
  // Group by vehicleClass
  const groups = new Map<string, { vehicle: Record<string, unknown>; index: number }[]>();
  for (let i = 0; i < vehicles.length; i++) {
    const cls = String(vehicles[i]["vehicleClass"] || "");
    if (!groups.has(cls)) groups.set(cls, []);
    groups.get(cls)!.push({ vehicle: vehicles[i], index: i });
  }

  // Within each group, sort by place and assign classPosition
  const result = vehicles.map(v => ({ ...v }));
  for (const group of Array.from(groups.values())) {
    group.sort((a, b) => (a.vehicle["place"] as number) - (b.vehicle["place"] as number));
    for (let rank = 0; rank < group.length; rank++) {
      result[group[rank].index]["classPosition"] = rank + 1;
    }
  }

  return result;
}

// ─── T9: LMUVehicleTelemetry (player) ───
const VT_LOCAL_VEL = 184; // LMUVect3 offset in telemetry slot
const VT_WHEELS = 848;    // LMUWheel[4] offset in telemetry slot
const WHEEL_SIZE = 260;

export function parsePlayerTelemetry(buf: Buffer, playerIdx: number): Record<string, unknown> | null {
  const T = LMU.TELEMETRY as any;
  const VT = LMU.VEHICLE_TELEMETRY as any;

  const playerHasVehicle = buf[T.PLAYER_HAS_VEHICLE] !== 0;
  if (!playerHasVehicle) return null;

  const po = T.TELEM_INFO.OFFSET + playerIdx * T.TELEM_INFO.STRIDE;

  // Speed from mLocalVel (LMUVect3)
  const vx = buf.readDoubleLE(po + VT_LOCAL_VEL);
  const vy = buf.readDoubleLE(po + VT_LOCAL_VEL + 8);
  const vz = buf.readDoubleLE(po + VT_LOCAL_VEL + 16);
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    id: buf.readInt32LE(po + VT.ID),
    lapNumber: buf.readInt32LE(po + VT.LAP_NUMBER),
    vehicleName: readStr(buf, po + VT.VEHICLE_NAME, 64),
    trackName: readStr(buf, po + VT.TRACK_NAME, 64),
    speed,
    gear: buf.readInt32LE(po + VT.GEAR),
    engineRpm: buf.readDoubleLE(po + VT.ENGINE_RPM),
    engineWaterTemp: buf.readDoubleLE(po + VT.ENGINE_WATER_TEMP),
    engineOilTemp: buf.readDoubleLE(po + VT.ENGINE_OIL_TEMP),
    throttle: buf.readDoubleLE(po + VT.FILTERED_THROTTLE),
    brake: buf.readDoubleLE(po + VT.FILTERED_BRAKE),
    steering: buf.readDoubleLE(po + VT.FILTERED_STEERING),
    clutch: buf.readDoubleLE(po + VT.FILTERED_CLUTCH),
    fuel: buf.readDoubleLE(po + VT.FUEL),
    engineMaxRPM: buf.readDoubleLE(po + VT.ENGINE_MAX_RPM),
    fuelCapacity: buf.readDoubleLE(po + VT.FUEL_CAPACITY),
    deltaBest: buf.readDoubleLE(po + VT.DELTA_BEST),
    currentSector: buf.readInt32LE(po + VT.CURRENT_SECTOR),
    stateOfCharge: buf.readFloatLE(po + VT.STATE_OF_CHARGE),
    timeGapAhead: buf.readFloatLE(po + VT.TIME_GAP_PLACE_AHEAD),
    timeGapBehind: buf.readFloatLE(po + VT.TIME_GAP_PLACE_BEHIND),
    vehicleModel: readStr(buf, po + VT.VEHICLE_MODEL, 30),
    rearFlapActivated: buf[po + VT.REAR_FLAP_ACTIVATED],
    rearFlapLegalStatus: buf[po + VT.REAR_FLAP_LEGAL_STATUS],
    batteryCharge: buf.readDoubleLE(po + VT.BATTERY_CHARGE_FRACTION),
  };
}

// ─── T10: LMUWheel parser ───
export function parseWheels(buf: Buffer, playerIdx: number): Record<string, unknown>[] | null {
  const T = LMU.TELEMETRY as any;
  const playerHasVehicle = buf[T.PLAYER_HAS_VEHICLE] !== 0;
  if (!playerHasVehicle) return null;

  const po = T.TELEM_INFO.OFFSET + playerIdx * T.TELEM_INFO.STRIDE;
  const WH = LMU.WHEEL as any;
  const wheels: Record<string, unknown>[] = [];

  for (let w = 0; w < 4; w++) {
    const wo = po + VT_WHEELS + w * WHEEL_SIZE;
    wheels.push({
      index: w,
      brakeTemp: buf.readDoubleLE(wo + WH.BRAKE_TEMP),
      brakePressure: buf.readDoubleLE(wo + WH.BRAKE_PRESSURE),
      pressure: buf.readDoubleLE(wo + WH.PRESSURE),
      wear: buf.readDoubleLE(wo + WH.WEAR),
      temperature0: buf.readDoubleLE(wo + WH.TEMPERATURE.OFFSET),
      temperature1: buf.readDoubleLE(wo + WH.TEMPERATURE.OFFSET + 8),
      temperature2: buf.readDoubleLE(wo + WH.TEMPERATURE.OFFSET + 16),
      surfaceType: buf[wo + WH.SURFACE_TYPE],
      flat: buf[wo + WH.FLAT] !== 0,
      detached: buf[wo + WH.DETACHED] !== 0,
      compoundType: buf[wo + WH.COMPOUND_TYPE],
      optimalTemp: buf.readFloatLE(wo + WH.OPTIMAL_TEMP),
    });
  }

  return wheels;
}

// ─── T11: High-level LMUObjectOut parser ───
export interface LMUParsedData {
  generic: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
  playerTelemetry: Record<string, unknown> | null;
  vehicles: Record<string, unknown>[];
  wheels: Record<string, unknown>[] | null;
}

export function parseLMUObjectOut(buf: Buffer): LMUParsedData | null {
  if (buf.length < LMU_OBJECT_OUT_SIZE) return null;

  const generic = parseGenericAndPaths(buf);
  const session = parseScoringInfo(buf);

  const T = LMU.TELEMETRY as any;
  const numVehicles = session?.["numVehicles"] as number ?? 0;
  const playerIdx = buf[T.PLAYER_VEHICLE_IDX];

  const vehicles = parseVehicleScoring(buf, numVehicles);
  const vehiclesWithClassPos = computeClassPositions(vehicles);
  const playerTelemetry = parsePlayerTelemetry(buf, playerIdx);
  const wheels = parseWheels(buf, playerIdx);

  return {
    generic,
    session,
    playerTelemetry,
    vehicles: vehiclesWithClassPos,
    wheels,
  };
}

// Need to import this for parseLMUObjectOut size check

