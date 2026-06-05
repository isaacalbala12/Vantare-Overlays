import { describe, it } from 'vitest';
import { SimNormalizer } from '../src/normalizer';

describe('LMU normalizer debug', () => {
  it('trace driverName through normalize', () => {
    const normalizer = new SimNormalizer();
    const raw = {
      driverName: 'TestDriver',
      carNumber: '42',
      teamName: 'TestTeam',
      speed: 280, rpm: 8500, gear: 3, throttle: 1.0, brake: 0,
      position: 2, lapDistance: 0, fuel: 60, fuelMax: 80,
      lap: { current: 1 },
      isOnTrack: true, isInPit: false, isPitting: false,
    };
    const result = normalizer.normalize(raw, 'lmu');
    console.log('result.player.driverName:', JSON.stringify(result.player.driverName));
    console.log('result.player.carNumber:', JSON.stringify(result.player.carNumber));
    console.log('result.player.teamName:', JSON.stringify(result.player.teamName));
    console.log('result.inputs.throttle:', result.inputs.throttle);
    console.log('result.inputs.brake:', result.inputs.brake);
  });
});
