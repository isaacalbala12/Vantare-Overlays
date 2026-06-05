import { z } from 'zod';
// ──────────────────────────────────────────────
// Zod safe parsers with `.catch()` defaults.
// Each returns a predictable fallback when the
// raw value is missing, wrong type, or out of range.
// ──────────────────────────────────────────────
/** Validate raw input is a (possibly null/undefined) object */
const RawSchema = z.record(z.unknown()).catch({});
/** Any number, coerces to fallback */
const num = (fallback = 0) => z.number().catch(fallback);
/** Non-negative number (speed, fuel, temps, etc.) */
const nonNeg = (fallback = 0) => z.number().nonnegative().catch(fallback);
/** Gear in valid range -1 … 8 (reverse … top gear) */
const gearVal = (fallback = 0) => z.number().int().min(-1).max(8).catch(fallback);
/** Normalised float 0 … 1 (throttle, brake, clutch) */
const norm01 = (fallback = 0) => z.number().min(0).max(1).catch(fallback);
/** Non-negative integer (lap counts, positions) */
const nonNegInt = (fallback = 0) => z.number().int().nonnegative().catch(fallback);
/** Coerced string */
const str = (fallback = '') => z.string().catch(fallback);
/** Coerced boolean */
const bool = (fallback = false) => z.boolean().catch(fallback);
/** Nested object */
const obj = () => z.record(z.unknown()).catch({});
// ──────────────────────────────────────────────
// Extraction helpers
// ──────────────────────────────────────────────
function getNum(d, k, fb = 0) {
    return num(fb).parse(d[k]);
}
function getNonNeg(d, k, fb = 0) {
    return nonNeg(fb).parse(d[k]);
}
function getGear(d, k, fb = 0) {
    return gearVal(fb).parse(d[k]);
}
function getNorm(d, k, fb = 0) {
    return norm01(fb).parse(d[k]);
}
function getNonNegInt(d, k, fb = 0) {
    return nonNegInt(fb).parse(d[k]);
}
function getStr(d, k, fb = '') {
    const val = d[k];
    if (typeof val === 'number' || typeof val === 'bigint') {
        return String(val);
    }
    return str(fb).parse(val);
}
function getBool(d, k, fb = false) {
    return bool(fb).parse(d[k]);
}
function getObj(d, k) {
    return obj().parse(d[k]);
}
/** Safely extract a numeric value from an array at a given index */
function getNumFromArray(val, idx, fb = 0) {
    if (Array.isArray(val)) {
        return num(fb).parse(val[idx]);
    }
    return fb;
}
// ──────────────────────────────────────────────
// Default helpers
// ──────────────────────────────────────────────
function defaultTyreInfo() {
    return { temp: 0, pressure: 0, wear: 0 };
}
function extractTyreInfo(obj, key) {
    const tyre = getObj(obj, key);
    return {
        temp: getNum(tyre, 'temp'),
        pressure: getNum(tyre, 'pressure'),
        wear: getNum(tyre, 'wear'),
    };
}
function extractTyreFromSet(obj, corner) {
    const tyres = getObj(obj, 'tyres');
    const tyre = getObj(tyres, corner);
    return {
        temp: getNum(tyre, 'temp'),
        pressure: getNum(tyre, 'pressure'),
        wear: getNum(tyre, 'wear'),
    };
}
function defaultTyreSet() {
    return { fl: defaultTyreInfo(), fr: defaultTyreInfo(), rl: defaultTyreInfo(), rr: defaultTyreInfo() };
}
// ──────────────────────────────────────────────
// Sim-specific extractors
// ──────────────────────────────────────────────
function extractIRacing(d) {
    return {
        player: {
            speed: getNonNeg(d, 'speed'),
            rpm: getNonNeg(d, 'rpm'),
            gear: getGear(d, 'gear'),
            isOnTrack: getBool(d, 'isOnTrack', true),
            isInPit: getBool(d, 'isInPit'),
            isPitting: getBool(d, 'isPitting'),
            position: getNonNegInt(d, 'position'),
            classPosition: getNonNegInt(d, 'classPosition'),
            lapDistance: getNonNeg(d, 'lapDistance'),
            lapCount: getNonNegInt(d, 'lapsComplete'),
            driverName: getStr(d, 'driverName'),
            carNumber: getStr(d, 'carNumber'),
            teamName: getStr(d, 'teamName'),
        },
        engine: {
            rpm: getNonNeg(d, 'rpm'),
            maxRpm: getNonNeg(d, 'maxRpm'),
            fuelLevel: getNonNeg(d, 'fuelLevel'),
            fuelCapacity: getNonNeg(d, 'fuelCapacity'),
            fuelPressure: getNonNeg(d, 'fuelPressure'),
            waterTemp: getNum(d, 'waterTemp'),
            oilTemp: getNum(d, 'oilTemp'),
            oilPressure: getNum(d, 'oilPressure'),
            engineWarnings: getNonNegInt(d, 'engineWarnings'),
        },
        inputs: {
            throttle: getNorm(d, 'throttle'),
            brake: getNorm(d, 'brake'),
            clutch: getNorm(d, 'clutch'),
            steering: getNum(d, 'steering'),
        },
        lap: {
            currentLap: getNonNegInt(d, 'lap'),
            totalLaps: getNonNegInt(d, 'totalLaps'),
            lastLaptime: getNonNeg(d, 'lastLaptime'),
            bestLaptime: getNonNeg(d, 'bestLaptime'),
            sector: getNonNegInt(d, 'sector'),
            sector1: getNonNeg(d, 'sector1'),
            sector2: getNonNeg(d, 'sector2'),
            sector3: getNonNeg(d, 'sector3'),
            estimatedLaptime: getNonNeg(d, 'estimatedLaptime'),
            delta: getNum(d, 'lapDelta'),
            isPersonalBest: getBool(d, 'isPersonalBest'),
            isSessionBest: getBool(d, 'isSessionBest'),
        },
        tyres: {
            fl: extractTyreInfo(d, 'tireLF'),
            fr: extractTyreInfo(d, 'tireRF'),
            rl: extractTyreInfo(d, 'tireLR'),
            rr: extractTyreInfo(d, 'tireRR'),
        },
        session: {
            type: getStr(d, 'sessionType'),
            state: getStr(d, 'sessionState'),
            timeRemaining: getNum(d, 'sessionTimeRemain'),
            timeElapsed: getNum(d, 'sessionTime'),
            totalLaps: getNonNegInt(d, 'totalLaps'),
            flags: [],
            trackName: getStr(d, 'trackName'),
            trackLength: getNonNeg(d, 'trackLength'),
            weather: {
                airTemp: getNum(d, 'airTemp'),
                trackTemp: getNum(d, 'trackTemp'),
                humidity: getNum(d, 'relativeHumidity'),
                precipitation: getNum(d, 'precipitation'),
                windSpeed: getNum(d, 'windVel'),
                windDirection: getNum(d, 'windDir'),
            },
        },
        weather: {
            airTemp: getNum(d, 'airTemp'),
            trackTemp: getNum(d, 'trackTemp'),
            humidity: getNum(d, 'relativeHumidity'),
            precipitation: getNum(d, 'precipitation'),
            windSpeed: getNum(d, 'windVel'),
            windDirection: getNum(d, 'windDir'),
        },
        track: {
            name: getStr(d, 'trackName'),
            length: getNonNeg(d, 'trackLength'),
            sectors: [],
        },
    };
}
function extractLMU(d) {
    const lapContainer = getObj(d, 'lap');
    const teamInfo = getObj(d, 'teamInfo');
    return {
        player: {
            speed: getNonNeg(d, 'speed'),
            rpm: getNonNeg(d, 'rpm'),
            gear: getGear(d, 'gear'),
            isOnTrack: getBool(d, 'isOnTrack', true),
            isInPit: getBool(d, 'isInPit'),
            isPitting: getBool(d, 'isPitting'),
            position: getNonNegInt(d, 'position'),
            classPosition: getNonNegInt(d, 'classPosition'),
            lapDistance: getNonNeg(d, 'lapDistance'),
            lapCount: getNonNegInt(lapContainer, 'current'),
            driverName: getStr(teamInfo, 'driverName'),
            carNumber: getStr(d, 'carNumber'),
            teamName: getStr(teamInfo, 'name'),
        },
        engine: {
            rpm: getNonNeg(d, 'rpm'),
            maxRpm: getNonNeg(d, 'maxRpm'),
            fuelLevel: getNonNeg(d, 'fuel'),
            fuelCapacity: getNonNeg(d, 'fuelMax'),
            fuelPressure: getNonNeg(d, 'fuelPressure'),
            waterTemp: getNum(d, 'engineWaterTemp'),
            oilTemp: getNum(d, 'engineOilTemp'),
            oilPressure: getNum(d, 'engineOilPressure'),
            engineWarnings: getNonNegInt(d, 'engineWarnings'),
        },
        inputs: {
            throttle: getNorm(d, 'throttle'),
            brake: getNorm(d, 'brake'),
            clutch: getNorm(d, 'clutch'),
            steering: getNum(d, 'steer'),
        },
        lap: {
            currentLap: getNonNegInt(lapContainer, 'current'),
            totalLaps: getNonNegInt(lapContainer, 'total'),
            lastLaptime: getNonNeg(lapContainer, 'lastTime'),
            bestLaptime: getNonNeg(lapContainer, 'bestTime'),
            sector: getNonNegInt(lapContainer, 'sector'),
            sector1: getNumFromArray(lapContainer['sectorTimes'], 0),
            sector2: getNumFromArray(lapContainer['sectorTimes'], 1),
            sector3: getNumFromArray(lapContainer['sectorTimes'], 2),
            estimatedLaptime: getNonNeg(lapContainer, 'estimatedLaptime'),
            delta: getNum(lapContainer, 'delta'),
            isPersonalBest: getBool(lapContainer, 'isPersonalBest'),
            isSessionBest: getBool(lapContainer, 'isSessionBest'),
        },
        tyres: {
            fl: extractTyreFromSet(d, 'fl'),
            fr: extractTyreFromSet(d, 'fr'),
            rl: extractTyreFromSet(d, 'rl'),
            rr: extractTyreFromSet(d, 'rr'),
        },
        session: {
            type: getStr(d, 'sessionType'),
            state: getStr(d, 'sessionState'),
            timeRemaining: getNum(d, 'sessionTimeRemain'),
            timeElapsed: getNum(d, 'sessionTime'),
            totalLaps: getNonNegInt(d, 'totalLaps'),
            flags: [],
            trackName: getStr(d, 'trackName'),
            trackLength: getNonNeg(d, 'trackLength'),
            weather: {
                airTemp: getNum(d, 'ambientTemp'),
                trackTemp: getNum(d, 'trackTemp'),
                humidity: getNum(d, 'humidity'),
                precipitation: getNum(d, 'rainIntensity'),
                windSpeed: getNum(d, 'windSpeed'),
                windDirection: getNum(d, 'windDirection'),
            },
        },
        weather: {
            airTemp: getNum(d, 'ambientTemp'),
            trackTemp: getNum(d, 'trackTemp'),
            humidity: getNum(d, 'humidity'),
            precipitation: getNum(d, 'rainIntensity'),
            windSpeed: getNum(d, 'windSpeed'),
            windDirection: getNum(d, 'windDirection'),
        },
        track: {
            name: getStr(d, 'trackName'),
            length: getNonNeg(d, 'trackLength'),
            sectors: [],
        },
    };
}
function extractAC(d) {
    const sessionContainer = getObj(d, 'session');
    // AC reports speed in km/h, stored as-is in Telemetry
    const speed = getNonNeg(d, 'speedKmh');
    return {
        player: {
            speed,
            rpm: getNonNeg(d, 'rpm'),
            gear: getGear(d, 'gear'),
            isOnTrack: getBool(d, 'isOnTrack', true),
            isInPit: getBool(d, 'isInPit'),
            isPitting: getBool(d, 'isPitting'),
            position: getNonNegInt(d, 'position'),
            classPosition: getNonNegInt(d, 'classPosition'),
            lapDistance: getNonNeg(d, 'lapDistance'),
            lapCount: getNonNegInt(d, 'numberOfLaps'),
            driverName: getStr(d, 'driverName'),
            carNumber: getStr(d, 'carNumber'),
            teamName: getStr(d, 'teamName'),
        },
        engine: {
            rpm: getNonNeg(d, 'rpm'),
            maxRpm: getNonNeg(d, 'maxRpm'),
            fuelLevel: getNonNeg(d, 'fuel'),
            fuelCapacity: getNonNeg(d, 'fuelMax'),
            fuelPressure: getNum(d, 'fuelPressure'),
            waterTemp: getNum(d, 'waterTemp'),
            oilTemp: getNum(d, 'oilTemp'),
            oilPressure: getNum(d, 'oilPressure'),
            engineWarnings: getNonNegInt(d, 'engineWarnings'),
        },
        inputs: {
            throttle: getNorm(d, 'gas'),
            brake: getNorm(d, 'brake'),
            clutch: getNorm(d, 'clutch'),
            steering: getNum(d, 'steerAngle'),
        },
        lap: {
            currentLap: getNonNegInt(d, 'numberOfLaps'),
            totalLaps: getNonNegInt(sessionContainer, 'laps'),
            lastLaptime: getNonNeg(d, 'lastLap'),
            bestLaptime: getNonNeg(d, 'bestLap'),
            sector: getNonNegInt(d, 'sector'),
            sector1: getNonNeg(d, 'sector1'),
            sector2: getNonNeg(d, 'sector2'),
            sector3: getNonNeg(d, 'sector3'),
            estimatedLaptime: getNonNeg(d, 'estimatedLaptime'),
            delta: getNum(d, 'delta'),
            isPersonalBest: getBool(d, 'isPersonalBest'),
            isSessionBest: getBool(d, 'isSessionBest'),
        },
        tyres: {
            fl: extractTyreFromSet(d, 'fl'),
            fr: extractTyreFromSet(d, 'fr'),
            rl: extractTyreFromSet(d, 'rl'),
            rr: extractTyreFromSet(d, 'rr'),
        },
        session: {
            type: getStr(sessionContainer, 'type'),
            state: getStr(sessionContainer, 'state'),
            timeRemaining: getNum(sessionContainer, 'time'),
            timeElapsed: getNum(sessionContainer, 'time'),
            totalLaps: getNonNegInt(sessionContainer, 'laps'),
            flags: [],
            trackName: getStr(sessionContainer, 'track'),
            trackLength: getNonNeg(d, 'trackLength'),
            weather: {
                airTemp: getNum(d, 'ambientTemp'),
                trackTemp: getNum(d, 'trackTemp'),
                humidity: getNum(d, 'humidity'),
                precipitation: getNum(d, 'precipitation'),
                windSpeed: getNum(d, 'windSpeed'),
                windDirection: getNum(d, 'windDirection'),
            },
        },
        track: {
            name: getStr(sessionContainer, 'track'),
            length: getNonNeg(d, 'trackLength'),
            sectors: [],
        },
    };
}
// ──────────────────────────────────────────────
// Default Telemetry factory
// ──────────────────────────────────────────────
function createDefaultTelemetry(sim, timestamp, connected) {
    return {
        sim,
        timestamp,
        isConnected: connected,
        player: {
            speed: 0,
            rpm: 0,
            gear: 0,
            isOnTrack: false,
            isInPit: false,
            isPitting: false,
            position: 0,
            classPosition: 0,
            lapDistance: 0,
            lapCount: 0,
            driverName: '',
            carNumber: '',
            teamName: '',
        },
        engine: {
            rpm: 0,
            maxRpm: 0,
            fuelLevel: 0,
            fuelCapacity: 0,
            fuelPressure: 0,
            waterTemp: 0,
            oilTemp: 0,
            oilPressure: 0,
            engineWarnings: 0,
        },
        tyres: { fl: defaultTyreInfo(), fr: defaultTyreInfo(), rl: defaultTyreInfo(), rr: defaultTyreInfo() },
        lap: {
            currentLap: 0,
            totalLaps: 0,
            lastLaptime: 0,
            bestLaptime: 0,
            sector: 0,
            sector1: 0,
            sector2: 0,
            sector3: 0,
            estimatedLaptime: 0,
            delta: 0,
            isPersonalBest: false,
            isSessionBest: false,
        },
        session: {
            type: '',
            state: '',
            timeRemaining: 0,
            timeElapsed: 0,
            totalLaps: 0,
            flags: [],
            trackName: '',
            trackLength: 0,
            weather: {
                airTemp: 0,
                trackTemp: 0,
                humidity: 0,
                precipitation: 0,
                windSpeed: 0,
                windDirection: 0,
            },
        },
        vehicles: [],
        track: {
            name: '',
            length: 0,
            sectors: [],
        },
        inputs: {
            throttle: 0,
            brake: 0,
            clutch: 0,
            steering: 0,
        },
        weather: {
            airTemp: 0,
            trackTemp: 0,
            humidity: 0,
            precipitation: 0,
            windSpeed: 0,
            windDirection: 0,
        },
    };
}
/**
 * Merge a partial Telemetry into a full default Telemetry.
 * Deep-merges the nested objects so that missing sub-fields
 * from the partial are filled by the defaults.
 */
function mergeDefaults(defaults, partial) {
    return {
        ...defaults,
        ...partial,
        player: { ...defaults.player, ...partial.player },
        engine: { ...defaults.engine, ...partial.engine },
        tyres: {
            fl: { ...defaults.tyres.fl, ...partial.tyres?.fl },
            fr: { ...defaults.tyres.fr, ...partial.tyres?.fr },
            rl: { ...defaults.tyres.rl, ...partial.tyres?.rl },
            rr: { ...defaults.tyres.rr, ...partial.tyres?.rr },
        },
        lap: { ...defaults.lap, ...partial.lap },
        session: {
            ...defaults.session,
            ...partial.session,
            weather: { ...defaults.session.weather, ...partial.session?.weather },
            flags: partial.session?.flags ?? defaults.session.flags,
        },
        track: { ...defaults.track, ...partial.track, sectors: partial.track?.sectors ?? defaults.track.sectors },
        inputs: { ...defaults.inputs, ...partial.inputs },
        weather: { ...defaults.weather, ...partial.weather },
        vehicles: partial.vehicles ?? defaults.vehicles,
    };
}
// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────
export class SimNormalizer {
    /**
     * Convert raw telemetry data from any supported sim into a
     * unified `Telemetry` object. Returns safe defaults for any
     * missing or invalid fields — never throws.
     */
    normalize(raw, sim) {
        const timestamp = Date.now();
        // null/undefined → disconnected Telemetry
        if (raw === null || raw === undefined) {
            return createDefaultTelemetry(sim, timestamp, false);
        }
        const data = RawSchema.parse(raw);
        const defaults = createDefaultTelemetry(sim, timestamp, true);
        let partial;
        switch (sim) {
            case 'iracing':
                partial = extractIRacing(data);
                break;
            case 'lmu':
                partial = extractLMU(data);
                break;
            case 'ac':
                partial = extractAC(data);
                break;
            default:
                partial = {};
        }
        return mergeDefaults(defaults, partial);
    }
    /**
     * Convert an array of raw vehicle data into unified `VehicleData[]`.
     * Invalid or missing entries receive safe defaults.
     */
    normalizeVehicles(rawVehicles, _sim) {
        if (!Array.isArray(rawVehicles)) {
            return [];
        }
        return rawVehicles.map((v) => this.normalizeVehicle(v));
    }
    normalizeVehicle(raw) {
        const d = obj().parse(raw);
        return {
            id: getNonNegInt(d, 'id'),
            driverName: getStr(d, 'driverName'),
            carNumber: getStr(d, 'carNumber'),
            teamName: getStr(d, 'teamName'),
            position: getNonNegInt(d, 'position'),
            classPosition: getNonNegInt(d, 'classPosition'),
            gap: getNum(d, 'gap'),
            gapType: (() => {
                const t = getStr(d, 'gapType');
                return t === 'laps' ? 'laps' : 'seconds';
            })(),
            lastLaptime: getNonNeg(d, 'lastLaptime'),
            bestLaptime: getNonNeg(d, 'bestLaptime'),
            sectorTimes: [
                getNumFromArray(d['sectorTimes'], 0),
                getNumFromArray(d['sectorTimes'], 1),
                getNumFromArray(d['sectorTimes'], 2),
            ],
            speed: getNonNeg(d, 'speed'),
            isPlayer: getBool(d, 'isPlayer'),
            isPitting: getBool(d, 'isPitting'),
            tyreCompound: getStr(d, 'tyreCompound'),
            fuelRemaining: getNum(d, 'fuelRemaining'),
            color: getStr(d, 'color'),
        };
    }
}
//# sourceMappingURL=normalizer.js.map