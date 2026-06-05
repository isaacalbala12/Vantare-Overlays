import { IRacingMock } from './iracing-mock';
import { LMUMock } from './lmu-mock';
import { ACMock } from './ac-mock';
export class MockSimFactory {
    static create(simType, scenario) {
        let provider;
        switch (simType) {
            case 'iracing':
                provider = new IRacingMock();
                break;
            case 'lmu':
                provider = new LMUMock();
                break;
            case 'ac':
                provider = new ACMock();
                break;
        }
        if (scenario) {
            provider.setScenario(scenario);
        }
        return provider;
    }
    static getAvailableSims() {
        return [
            { id: 'iracing', name: 'iRacing', available: true },
            { id: 'lmu', name: 'LMU', available: true },
            { id: 'ac', name: 'Assetto Corsa', available: true },
        ];
    }
}
//# sourceMappingURL=mock-sim-factory.js.map