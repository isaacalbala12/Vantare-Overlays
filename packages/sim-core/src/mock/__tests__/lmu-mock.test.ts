import { describe, it, expect } from 'vitest';
import { LMUMock } from '../lmu-mock';

describe('LMUMock', () => {
  it('should have correct name and simType', () => {
    const mock = new LMUMock();
    expect(mock.name).toBe('LMU');
    expect(mock.simType).toBe('lmu');
  });

  it('should return available sims', () => {
    const mock = new LMUMock();
    const sims = mock.getAvailableSims();
    expect(sims.length).toBeGreaterThan(0);
    expect(sims[0].id).toBe('lmu');
    expect(sims[0].available).toBe(true);
  });

  describe('getData() - valid Telemetry', () => {
    const mock = new LMUMock();
    const data = mock.getData();

    it('should return correct sim type', () => {
      expect(data.sim).toBe('lmu');
      expect(data.isConnected).toBe(true);
    });

    it('should have player speed within LMU ranges', () => {
      expect(data.player.speed).toBeGreaterThanOrEqual(0);
      expect(data.player.rpm).toBeGreaterThan(0);
    });

    it('should have engine data', () => {
      expect(data.engine.rpm).toBeGreaterThan(0);
      expect(data.engine.fuelLevel).toBeGreaterThan(0);
    });

    it('should have tyre data for all 4 corners', () => {
      expect(data.tyres.fl.temp).toBeGreaterThan(0);
      expect(data.tyres.fr.temp).toBeGreaterThan(0);
      expect(data.tyres.rl.temp).toBeGreaterThan(0);
      expect(data.tyres.rr.temp).toBeGreaterThan(0);
    });

    it('should have vehicles array', () => {
      expect(Array.isArray(data.vehicles)).toBe(true);
      expect(data.vehicles.length).toBeGreaterThan(0);
    });

    it('should have track and weather data', () => {
      expect(data.track.name).toBeTruthy();
      expect(data.weather.airTemp).toBeGreaterThan(0);
    });
  });

  describe('scenarios', () => {
    it('practice: speed 100-250 km/h', () => {
      const mock = new LMUMock();
      mock.setScenario('practice');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(100);
      expect(data.player.speed).toBeLessThanOrEqual(250);
    });

    it('qualifying: speed 150-320', () => {
      const mock = new LMUMock();
      mock.setScenario('qualifying');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(150);
      expect(data.player.speed).toBeLessThanOrEqual(320);
    });

    it('race: speed 120-300', () => {
      const mock = new LMUMock();
      mock.setScenario('race');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(120);
      expect(data.player.speed).toBeLessThanOrEqual(300);
    });

    it('crash: speed 0', () => {
      const mock = new LMUMock();
      mock.setScenario('crash');
      const data = mock.getData();
      expect(data.player.speed).toBe(0);
    });

    it('formation-lap: speed 60-120', () => {
      const mock = new LMUMock();
      mock.setScenario('formation-lap');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(60);
      expect(data.player.speed).toBeLessThanOrEqual(120);
    });

    it('pit-stop: in pit', () => {
      const mock = new LMUMock();
      mock.setScenario('pit-stop');
      const data = mock.getData();
      expect(data.player.isInPit).toBe(true);
      expect(data.player.isPitting).toBe(true);
    });
  });

  describe('state advancement', () => {
    it('should decrease fuel during race', () => {
      const mock = new LMUMock();
      mock.setScenario('race');
      const first = mock.getData();
      for (let i = 0; i < 100; i++) {
        mock.getData();
      }
      const last = mock.getData();
      expect(last.engine.fuelLevel).toBeLessThan(first.engine.fuelLevel);
    });

    it('should increase fuel during pit-stop', () => {
      const mock = new LMUMock();
      mock.setScenario('pit-stop');
      const first = mock.getData();
      for (let i = 0; i < 50; i++) {
        mock.getData();
      }
      const last = mock.getData();
      expect(last.engine.fuelLevel).toBeGreaterThan(first.engine.fuelLevel);
    });
  });
});
