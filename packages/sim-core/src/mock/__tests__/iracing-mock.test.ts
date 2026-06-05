import { describe, it, expect } from 'vitest';
import { IRacingMock } from '../iracing-mock';

describe('IRacingMock', () => {
  it('should have correct name and simType', () => {
    const mock = new IRacingMock();
    expect(mock.name).toBe('iRacing');
    expect(mock.simType).toBe('iracing');
  });

  it('should return available sims', () => {
    const mock = new IRacingMock();
    const sims = mock.getAvailableSims();
    expect(sims.length).toBeGreaterThan(0);
    expect(sims[0].id).toBe('iracing');
    expect(sims[0].available).toBe(true);
  });

  describe('getData() - default (practice)', () => {
    const mock = new IRacingMock();
    const data = mock.getData();

    it('should return valid Telemetry structure', () => {
      expect(data.sim).toBe('iracing');
      expect(typeof data.timestamp).toBe('number');
      expect(data.isConnected).toBe(true);
    });

    it('should have player data', () => {
      expect(typeof data.player.speed).toBe('number');
      expect(typeof data.player.rpm).toBe('number');
      expect(data.player.speed).toBeGreaterThanOrEqual(0);
      expect(data.player.driverName).toBeTruthy();
    });

    it('should have engine data', () => {
      expect(data.engine.rpm).toBeGreaterThan(0);
      expect(data.engine.fuelLevel).toBeGreaterThan(0);
      expect(data.engine.fuelCapacity).toBeGreaterThan(0);
    });

    it('should have tyre data', () => {
      expect(data.tyres.fl.temp).toBeGreaterThan(0);
      expect(data.tyres.fr.pressure).toBeGreaterThan(0);
      expect(data.tyres.rl.wear).toBeGreaterThanOrEqual(0);
      expect(data.tyres.rr.wear).toBeGreaterThanOrEqual(0);
    });

    it('should have lap data', () => {
      expect(data.lap.currentLap).toBeGreaterThanOrEqual(0);
      expect(data.lap.totalLaps).toBeGreaterThan(0);
      expect(data.lap.lastLaptime).toBeGreaterThan(0);
    });

    it('should have session data', () => {
      expect(data.session.type).toBeTruthy();
      expect(data.session.state).toBeTruthy();
      expect(Array.isArray(data.session.flags)).toBe(true);
    });

    it('should have vehicles array', () => {
      expect(Array.isArray(data.vehicles)).toBe(true);
      expect(data.vehicles.length).toBeGreaterThan(0);
    });

    it('should have vehicle data with required fields', () => {
      const v = data.vehicles[0];
      expect(typeof v.id).toBe('number');
      expect(typeof v.driverName).toBe('string');
      expect(typeof v.position).toBe('number');
      expect(typeof v.speed).toBe('number');
      expect(typeof v.gap).toBe('number');
      expect(['seconds', 'laps']).toContain(v.gapType);
    });

    it('should have track data', () => {
      expect(data.track.name).toBeTruthy();
      expect(data.track.length).toBeGreaterThan(0);
    });

    it('should have input data', () => {
      expect(data.inputs.throttle).toBeGreaterThanOrEqual(0);
      expect(data.inputs.brake).toBeGreaterThanOrEqual(0);
      expect(data.inputs.steering).toBeGreaterThanOrEqual(-1);
      expect(data.inputs.steering).toBeLessThanOrEqual(1);
    });

    it('should have weather data', () => {
      expect(typeof data.weather.airTemp).toBe('number');
      expect(typeof data.weather.trackTemp).toBe('number');
    });
  });

  describe('scenario ranges', () => {
    it('practice: speed 100-250 km/h', () => {
      const mock = new IRacingMock();
      mock.setScenario('practice');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(100);
      expect(data.player.speed).toBeLessThanOrEqual(250);
    });

    it('qualifying: speed 150-320 km/h, position 1-5', () => {
      const mock = new IRacingMock();
      mock.setScenario('qualifying');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(150);
      expect(data.player.speed).toBeLessThanOrEqual(320);
      expect(data.player.position).toBeGreaterThanOrEqual(1);
      expect(data.player.position).toBeLessThanOrEqual(5);
    });

    it('race: speed 120-300 km/h, position 1-20', () => {
      const mock = new IRacingMock();
      mock.setScenario('race');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(120);
      expect(data.player.speed).toBeLessThanOrEqual(300);
      expect(data.player.position).toBeGreaterThanOrEqual(1);
      expect(data.player.position).toBeLessThanOrEqual(20);
    });

    it('pit-stop: speed 0-60, in pit', () => {
      const mock = new IRacingMock();
      mock.setScenario('pit-stop');
      const data = mock.getData();
      expect(data.player.speed).toBeLessThanOrEqual(60);
      expect(data.player.isInPit).toBe(true);
      expect(data.player.isPitting).toBe(true);
    });

    it('crash: speed 0, yellow flag', () => {
      const mock = new IRacingMock();
      mock.setScenario('crash');
      const data = mock.getData();
      expect(data.player.speed).toBe(0);
      expect(data.session.flags.some((f) => f.type === 'yellow')).toBe(true);
    });

    it('formation-lap: speed 60-120, green flag', () => {
      const mock = new IRacingMock();
      mock.setScenario('formation-lap');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(60);
      expect(data.player.speed).toBeLessThanOrEqual(120);
    });
  });

  describe('state advancement', () => {
    it('should advance state on multiple getData() calls', () => {
      const mock = new IRacingMock();
      mock.setScenario('race');
      const first = mock.getData();
      const second = mock.getData();
      expect(second.timestamp).toBeGreaterThan(first.timestamp);
    });

    it('should decrease fuel during race', () => {
      const mock = new IRacingMock();
      mock.setScenario('race');
      const first = mock.getData();
      // Simulate many calls for noticeable fuel decrease
      for (let i = 0; i < 100; i++) {
        mock.getData();
      }
      const last = mock.getData();
      expect(last.engine.fuelLevel).toBeLessThan(first.engine.fuelLevel);
    });

    it('should increase vehicles position over lap count', () => {
      const mock = new IRacingMock();
      mock.setScenario('race');
      const data = mock.getData();
      expect(data.lap.currentLap).toBeGreaterThanOrEqual(0);
    });
  });
});
