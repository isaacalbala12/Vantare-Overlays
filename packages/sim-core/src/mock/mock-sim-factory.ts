import type { MockProvider, MockScenario, SimInfo } from './mock-provider';
import { IRacingMock } from './iracing-mock';
import { LMUMock } from './lmu-mock';
import { ACMock } from './ac-mock';

export class MockSimFactory {
  static create(simType: 'iracing' | 'lmu' | 'ac', scenario?: MockScenario): MockProvider {
    let provider: MockProvider;

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

  static getAvailableSims(): SimInfo[] {
    return [
      { id: 'iracing', name: 'iRacing', available: true },
      { id: 'lmu', name: 'LMU', available: true },
      { id: 'ac', name: 'Assetto Corsa', available: true },
    ];
  }
}
