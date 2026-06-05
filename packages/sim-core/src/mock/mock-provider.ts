import type { Telemetry } from '../types';

export type MockScenario =
  | 'practice'
  | 'qualifying'
  | 'race'
  | 'pit-stop'
  | 'crash'
  | 'formation-lap';

export interface SimInfo {
  id: string;
  name: string;
  available: boolean;
}

export interface MockProvider {
  readonly name: string;
  readonly simType: 'iracing' | 'lmu' | 'ac';
  getData(): Telemetry;
  setScenario(scenario: MockScenario): void;
  getAvailableSims(): SimInfo[];
}
