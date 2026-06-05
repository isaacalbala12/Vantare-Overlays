import { describe, it } from 'vitest';
import { SimNormalizer } from '../src/normalizer';

describe('LMU normalizer debug', () => {
  it('check driverName through normalizer', () => {
    const normalizer = new SimNormalizer();
    const raw = {
      sessionTime: 0, lap: { current: 1, total: 0, lastTime: 0, bestTime: 0, sector: 0, sectorTimes: [], estimatedLaptime: 0, delta: 0, isPersonalBest: false, isSessionBest: false },
      speed: 280, rpm: 8500, gear: 3, steer: 0, throttle: 1.0, brake: 0, clutch: 0,
      position: 2, classPosition: 1, lapDistance: 0, fuel: 60, fuelMax: 80,
      engineWaterTemp: 0, engineOilTemp: 0, engineOilPressure: 0,
      trackTemp: 0, ambientTemp: 0, windSpeed: 0, windDirection: 0, maxRpm: 9000,
      driverName: 'TestDriver',
      isOnTrack: true, isInPit: false, isPitting: false,
      carNumber: '', teamName: '', sessionType: '', sessionState: '',
      engineWarnings: 0, fuelPressure: 0, humidity: 0, rainIntensity: 0,
      totalLaps: 0, trackName: '', trackLength: 0, sessionTimeRemain: 0,
    };
    const result = normalizer.normalize(raw, 'lmu');
    console.log('driverName:', JSON.stringify(result.player.driverName));
    console.log('carNumber:', JSON.stringify(result.player.carNumber));
    console.log('teamName:', JSON.stringify(result.player.teamName));
  });
});
