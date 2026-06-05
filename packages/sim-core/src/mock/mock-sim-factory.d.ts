import type { MockProvider, MockScenario, SimInfo } from './mock-provider';
export declare class MockSimFactory {
    static create(simType: 'iracing' | 'lmu' | 'ac', scenario?: MockScenario): MockProvider;
    static getAvailableSims(): SimInfo[];
}
//# sourceMappingURL=mock-sim-factory.d.ts.map