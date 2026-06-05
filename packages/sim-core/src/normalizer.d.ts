import type { Telemetry, VehicleData, SimType } from './types';
export declare class SimNormalizer {
    /**
     * Convert raw telemetry data from any supported sim into a
     * unified `Telemetry` object. Returns safe defaults for any
     * missing or invalid fields — never throws.
     */
    normalize(raw: unknown, sim: SimType): Telemetry;
    /**
     * Convert an array of raw vehicle data into unified `VehicleData[]`.
     * Invalid or missing entries receive safe defaults.
     */
    normalizeVehicles(rawVehicles: unknown[], _sim: SimType): VehicleData[];
    private normalizeVehicle;
}
//# sourceMappingURL=normalizer.d.ts.map