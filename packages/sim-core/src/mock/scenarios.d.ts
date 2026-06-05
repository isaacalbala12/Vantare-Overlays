import type { MockScenario } from './mock-provider';
export interface ScenarioConfig {
    speedMin: number;
    speedMax: number;
    rpmMin: number;
    rpmMax: number;
    fuelBehavior: 'full' | 'low' | 'decreasing' | 'increasing' | 'empty';
    positionRange: [number, number] | null;
    hasTraffic: boolean;
    flags: string[];
    isPit: boolean;
    isPitting: boolean;
    isOnTrack: boolean;
    vehicleCount: number;
    gearRange: [number, number];
    baseLaptime: number;
    sessionType: string;
}
export declare const SCENARIO_CONFIGS: Record<MockScenario, ScenarioConfig>;
//# sourceMappingURL=scenarios.d.ts.map