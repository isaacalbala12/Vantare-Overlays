import { describe, it, expect } from 'vitest';
import { SimNormalizer } from '../normalizer';

describe('SimNormalizer', () => {
  const normalizer = new SimNormalizer();

  describe('normalize', () => {
    it('should normalize valid iRacing-like data', () => {
      const raw = {
        rpm: 7500,
        speed: 180,
        gear: 4,
        throttle: 0.85,
        brake: 0.0,
        clutch: 0.0,
        steering: 0.1,
        fuelLevel: 45.2,
        fuelCapacity: 100,
        fuelPressure: 55.0,
        waterTemp: 85,
        oilTemp: 95,
        oilPressure: 60,
        engineWarnings: 0,
        lap: 3,
        lapDistance: 1250.5,
        lapsComplete: 2,
        driverName: 'Test Driver',
        carNumber: '123',
        teamName: 'Test Team',
        position: 2,
        classPosition: 1,
        lastLaptime: 95_000,
        bestLaptime: 93_500,
        sessionTime: 150.5,
        trackTemp: 30,
        airTemp: 25,
      };

      const result = normalizer.normalize(raw, 'iracing');

      expect(result.sim).toBe('iracing');
      expect(result.player.speed).toBe(180);
      expect(result.player.rpm).toBe(7500);
      expect(result.player.gear).toBe(4);
      expect(result.engine.rpm).toBe(7500);
      expect(result.engine.fuelLevel).toBe(45.2);
      expect(result.engine.fuelCapacity).toBe(100);
      expect(result.engine.waterTemp).toBe(85);
      expect(result.engine.oilTemp).toBe(95);
      expect(result.engine.oilPressure).toBe(60);
      expect(result.inputs.throttle).toBe(0.85);
      expect(result.inputs.brake).toBe(0);
      expect(result.inputs.steering).toBe(0.1);
      expect(result.lap.currentLap).toBe(3);
      expect(result.lap.lastLaptime).toBe(95_000);
      expect(result.lap.bestLaptime).toBe(93_500);
      expect(result.player.lapCount).toBe(2);
      expect(result.player.lapDistance).toBe(1250.5);
      expect(result.player.position).toBe(2);
      expect(result.player.classPosition).toBe(1);
      expect(result.session.weather.trackTemp).toBe(30);
      expect(result.session.weather.airTemp).toBe(25);
      expect(result.isConnected).toBe(true);
    });

    it('should normalize valid LMU-like data', () => {
      const raw = {
        rpm: 6800,
        speed: 165,
        gear: 5,
        throttle: 0.9,
        brake: 0.1,
        steer: 0.05,
        clutch: 0,
        fuel: 60.5,
        fuelMax: 110,
        fuelPressure: 52.0,
        engineWaterTemp: 88,
        engineOilTemp: 92,
        engineOilPressure: 58,
        engineWarnings: 0,
        position: 3,
        classPosition: 2,
        trackTemp: 32,
        ambientTemp: 24,
        rainIntensity: 0.2,
        windSpeed: 5.0,
        windDirection: 180,
      };

      const result = normalizer.normalize(raw, 'lmu');

      expect(result.sim).toBe('lmu');
      expect(result.player.speed).toBe(165);
      expect(result.player.rpm).toBe(6800);
      expect(result.player.gear).toBe(5);
      expect(result.engine.rpm).toBe(6800);
      expect(result.engine.fuelLevel).toBe(60.5);
      expect(result.engine.fuelCapacity).toBe(110);
      expect(result.engine.waterTemp).toBe(88);
      expect(result.engine.oilTemp).toBe(92);
      expect(result.engine.oilPressure).toBe(58);
      expect(result.inputs.throttle).toBe(0.9);
      expect(result.inputs.brake).toBe(0.1);
      expect(result.player.position).toBe(3);
      expect(result.player.classPosition).toBe(2);
      expect(result.session.weather.trackTemp).toBe(32);
      expect(result.session.weather.airTemp).toBe(24);
    });

    it('should normalize valid AC-like data', () => {
      const raw = {
        rpm: 7200,
        speedKmh: 210,
        gear: 6,
        gas: 0.75,
        brake: 0.2,
        clutch: 0,
        steerAngle: 0.08,
        fuel: 35.0,
        fuelMax: 80,
        waterTemp: 82,
        oilTemp: 90,
        oilPressure: 55,
        position: 5,
      };

      const result = normalizer.normalize(raw, 'ac');

      expect(result.sim).toBe('ac');
      expect(result.player.speed).toBe(210);
      expect(result.player.rpm).toBe(7200);
      expect(result.player.gear).toBe(6);
      expect(result.engine.rpm).toBe(7200);
      expect(result.engine.fuelLevel).toBe(35.0);
      expect(result.engine.fuelCapacity).toBe(80);
      expect(result.engine.waterTemp).toBe(82);
      expect(result.engine.oilTemp).toBe(90);
      expect(result.engine.oilPressure).toBe(55);
      expect(result.inputs.throttle).toBe(0.75);
      expect(result.inputs.brake).toBe(0.2);
      expect(result.tyres.fl.temp).toBe(0);
      expect(result.tyres.fr.temp).toBe(0);
      expect(result.tyres.rl.temp).toBe(0);
      expect(result.tyres.rr.temp).toBe(0);
    });

    it('should handle null/undefined/empty data with defaults', () => {
      const nullResult = normalizer.normalize(null, 'iracing');
      expect(nullResult.player.speed).toBe(0);
      expect(nullResult.player.rpm).toBe(0);
      expect(nullResult.player.gear).toBe(0);
      expect(nullResult.engine.fuelLevel).toBe(0);
      expect(nullResult.player.lapCount).toBe(0);
      expect(nullResult.player.driverName).toBe('');
      expect(nullResult.isConnected).toBe(false);

      const undefinedResult = normalizer.normalize(undefined, 'lmu');
      expect(undefinedResult.player.speed).toBe(0);

      const emptyResult = normalizer.normalize({}, 'ac');
      expect(emptyResult.player.speed).toBe(0);
      expect(emptyResult.player.rpm).toBe(0);
      expect(emptyResult.player.gear).toBe(0);
    });

    it('should handle incomplete data gracefully', () => {
      const partial = { rpm: 5000 };

      const result = normalizer.normalize(partial, 'iracing');

      expect(result.player.rpm).toBe(5000);
      expect(result.player.speed).toBe(0);
      expect(result.player.gear).toBe(0);
      expect(result.engine.fuelLevel).toBe(0);
      expect(result.inputs.throttle).toBe(0);
      expect(result.inputs.brake).toBe(0);
    });

    it('should clamp invalid values to safe defaults', () => {
      const badData = {
        rpm: -100,
        speed: -50,
        gear: 99,
        throttle: 999,
        fuelLevel: -1,
      };

      const result = normalizer.normalize(badData, 'iracing');
      expect(result.player.rpm).toBe(0);
      expect(result.player.speed).toBe(0);
      expect(result.player.gear).toBe(0);
      expect(result.inputs.throttle).toBe(0);
      expect(result.engine.fuelLevel).toBe(0);
    });

    it('should populate tyre data with defaults when missing', () => {
      const result = normalizer.normalize({}, 'iracing');
      expect(result.tyres.fl.temp).toBe(0);
      expect(result.tyres.fl.pressure).toBe(0);
      expect(result.tyres.fl.wear).toBe(0);
      expect(result.tyres.fr.temp).toBe(0);
      expect(result.tyres.rl.temp).toBe(0);
      expect(result.tyres.rr.temp).toBe(0);
    });

    it('should preserve iRacing tyre data when provided', () => {
      const raw = {
        tireLF: { pressure: 25.0, temp: 90, wear: 0.15 },
        tireRF: { pressure: 25.2, temp: 92, wear: 0.12 },
        tireLR: { pressure: 24.8, temp: 88, wear: 0.18 },
        tireRR: { pressure: 25.1, temp: 89, wear: 0.16 },
      };

      const result = normalizer.normalize(raw, 'iracing');
      expect(result.tyres.fl.pressure).toBe(25.0);
      expect(result.tyres.fl.temp).toBe(90);
      expect(result.tyres.fl.wear).toBe(0.15);
      expect(result.tyres.fr.pressure).toBe(25.2);
      expect(result.tyres.rl.pressure).toBe(24.8);
      expect(result.tyres.rr.pressure).toBe(25.1);
    });

    it('should set correct timestamp', () => {
      const before = Date.now();
      const result = normalizer.normalize({}, 'iracing');
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should populate session data', () => {
      const result = normalizer.normalize({}, 'iracing');
      expect(result.session.flags).toEqual([]);
      expect(result.session.state).toBe('');
      expect(result.session.type).toBe('');
    });

    it('should populate lap data with defaults', () => {
      const result = normalizer.normalize({}, 'iracing');
      expect(result.lap.currentLap).toBe(0);
      expect(result.lap.totalLaps).toBe(0);
      expect(result.lap.lastLaptime).toBe(0);
      expect(result.lap.bestLaptime).toBe(0);
      expect(result.lap.delta).toBe(0);
      expect(result.lap.isPersonalBest).toBe(false);
      expect(result.lap.isSessionBest).toBe(false);
    });

    it('should map LMU lap data', () => {
      const raw = {
        lap: {
          current: 5,
          total: 30,
          lastTime: 95_000,
          bestTime: 93_500,
          sector: 2,
          sectorTimes: [30_000, 32_000, 33_000],
          delta: 0.5,
        },
      };

      const result = normalizer.normalize(raw, 'lmu');
      expect(result.lap.currentLap).toBe(5);
      expect(result.lap.totalLaps).toBe(30);
      expect(result.lap.lastLaptime).toBe(95_000);
      expect(result.lap.bestLaptime).toBe(93_500);
      expect(result.player.lapCount).toBe(5);
      expect(result.lap.sector).toBe(2);
      expect(result.lap.sector1).toBe(30_000);
      expect(result.lap.sector2).toBe(32_000);
      expect(result.lap.sector3).toBe(33_000);
    });

    it('should map AC session data', () => {
      const raw = {
        session: {
          type: 1,
          state: 2,
          time: 300.0,
          laps: 25,
          track: 'Monza',
          trackConfig: 'GP',
        },
      };

      const result = normalizer.normalize(raw, 'ac');
      expect(result.session.type).toBe('1');
      expect(result.session.state).toBe('2');
      expect(result.session.totalLaps).toBe(25);
    });
  });

  describe('normalizeVehicles', () => {
    it('should normalize an array of vehicle data', () => {
      const rawVehicles = [
        {
          id: 0,
          driverName: 'Player One',
          carNumber: '123',
          teamName: 'Team A',
          position: 1,
          classPosition: 1,
          gap: 0,
          gapType: 'seconds',
          lastLaptime: 95_000,
          bestLaptime: 94_200,
          sectorTimes: [30_000, 32_000, 33_000],
          speed: 180,
          isPlayer: true,
          isPitting: false,
          tyreCompound: 'Soft',
          fuelRemaining: 45.0,
          color: '#FF0000',
        },
        {
          id: 1,
          driverName: 'Player Two',
          carNumber: '456',
          teamName: 'Team B',
          position: 2,
          classPosition: 2,
          gap: 2.5,
          gapType: 'seconds',
          lastLaptime: 96_000,
          bestLaptime: 95_000,
          sectorTimes: [31_000, 32_500, 32_500],
          speed: 175,
          isPlayer: false,
          isPitting: false,
          tyreCompound: 'Medium',
          fuelRemaining: 50.0,
          color: '#00FF00',
        },
      ];

      const result = normalizer.normalizeVehicles(rawVehicles, 'iracing');

      expect(result).toHaveLength(2);
      expect(result[0].driverName).toBe('Player One');
      expect(result[0].position).toBe(1);
      expect(result[0].isPlayer).toBe(true);
      expect(result[0].fuelRemaining).toBe(45.0);
      expect(result[1].driverName).toBe('Player Two');
      expect(result[1].position).toBe(2);
      expect(result[1].isPlayer).toBe(false);
    });

    it('should return empty array for empty/null/undefined input', () => {
      expect(normalizer.normalizeVehicles([], 'iracing')).toEqual([]);
      expect(normalizer.normalizeVehicles((null as unknown as unknown[]), 'iracing')).toEqual([]);
      expect(normalizer.normalizeVehicles((undefined as unknown as unknown[]), 'iracing')).toEqual([]);
    });

    it('should fill defaults for missing vehicle fields', () => {
      const partial = [{ id: 1 }];

      const result = normalizer.normalizeVehicles(partial, 'iracing');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].driverName).toBe('');
      expect(result[0].carNumber).toBe('');
      expect(result[0].teamName).toBe('');
      expect(result[0].position).toBe(0);
      expect(result[0].speed).toBe(0);
      expect(result[0].gap).toBe(0);
      expect(result[0].isPlayer).toBe(false);
      expect(result[0].fuelRemaining).toBe(0);
    });

    it('should handle bad vehicle data without crashing', () => {
      const badVehicles = [
        null,
        { id: 'not-a-number' },
        undefined,
      ];

      const result = normalizer.normalizeVehicles(badVehicles, 'iracing');
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(0);
      expect(result[1].id).toBe(0);
      expect(result[2].id).toBe(0);
    });
  });
});





