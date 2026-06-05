import type { Telemetry } from '../types';
import type { MockProvider, MockScenario, SimInfo } from './mock-provider';
export declare class ACMock implements MockProvider {
    readonly name = "Assetto Corsa";
    readonly simType: "ac";
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
//# sourceMappingURL=ac-mock.d.ts.map