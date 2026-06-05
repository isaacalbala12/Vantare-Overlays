import type { Telemetry } from '../types';
import type { MockProvider, MockScenario, SimInfo } from './mock-provider';
export declare class LMUMock implements MockProvider {
    readonly name = "LMU";
    readonly simType: "lmu";
    private scenario;
    private rng;
    private tickCount;
    private lapCount;
    private fuelLevel;
    private fuelCapacity;
    private position;
    private trackIndex;
    constructor();
    setScenario(scenario: MockScenario): void;
    getAvailableSims(): SimInfo[];
    getData(): Telemetry;
    private getConfig;
    private generateSpeed;
    private generateRpm;
    private generateGear;
    private generateFlags;
    private generateVehicles;
    private getDriverColor;
    private advanceFuel;
    private advanceLap;
    private advancePosition;
}
//# sourceMappingURL=lmu-mock.d.ts.map