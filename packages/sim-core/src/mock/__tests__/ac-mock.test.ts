import { describe, it, expect } from 'vitest';
import { ACMock } from '../ac-mock';

describe('ACMock', () => {
  it('should have correct name and simType', () => {
    const mock = new ACMock();
    expect(mock.name).toBe('Assetto Corsa');
    expect(mock.simType).toBe('ac');
  });

  it('should return available sims', () => {
    const mock = new ACMock();
    const sims = mock.getAvailableSims();
    expect(sims.length).toBeGreaterThan(0);
    expect(sims[0].id).toBe('ac');
    expect(sims[0].available).toBe(true);
  });

  describe('getData() - valid Telemetry', () => {
    const mock = new ACMock();
    const data = mock.getData();

    it('should return correct sim type', () => {
      expect(data.sim).toBe('ac');
      expect(data.isConnected).toBe(true);
    });

    it('should have player data', () => {
      expect(data.player.speed).toBeGreaterThanOrEqual(0);
      expect(data.player.rpm).toBeGreaterThan(0);
    });

    it('should have engine data', () => {
      expect(data.engine.rpm).toBeGreaterThan(0);
      expect(data.engine.waterTemp).toBeGreaterThan(0);
    });

    it('should have tyre data', () => {
      expect(data.tyres.fl.temp).toBeGreaterThan(0);
      expect(data.tyres.fr.temp).toBeGreaterThan(0);
      expect(data.tyres.rl.temp).toBeGreaterThan(0);
      expect(data.tyres.rr.temp).toBeGreaterThan(0);
    });

    it('should have vehicles array', () => {
      expect(Array.isArray(data.vehicles)).toBe(true);
      expect(data.vehicles.length).toBeGreaterThan(0);
    });

    it('should have input data', () => {
      expect(data.inputs.throttle).toBeGreaterThanOrEqual(0);
      expect(data.inputs.brake).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scenarios', () => {
    it('practice: speed 100-250 km/h', () => {
      const mock = new ACMock();
      mock.setScenario('practice');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(100);
      expect(data.player.speed).toBeLessThanOrEqual(250);
    });

    it('qualifying: speed 150-320', () => {
      const mock = new ACMock();
      mock.setScenario('qualifying');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(150);
      expect(data.player.speed).toBeLessThanOrEqual(320);
    });

    it('race: speed 120-300', () => {
      const mock = new ACMock();
      mock.setScenario('race');
      const data = mock.getData();
      expect(data.player.speed).toBeGreaterThanOrEqual(120);
      expect(data.player.speed).toBeLessThanOrEqual(300);
    });

    it('crash: speed 0', () => {
      const mock = new ACMock();
      mock.setScenario('crash');
      const data = mock.getData();
      expect(data.player.speed).toBe(0);
    });
  });

  describe('state advancement', () => {
    it('should advance timestamp', () => {
      const mock = new ACMock();
      mock.setScenario('race');
      const first = mock.getData();
      const second = mock.getData();
      expect(second.timestamp).toBeGreaterThan(first.timestamp);
    });

    it('should decrease fuel during race', () => {
      const mock = new ACMock();
      mock.setScenario('race');
      const first = mock.getData();
      for (let i = 0; i < 100; i++) {
        mock.getData();
      }
      const last = mock.getData();
      expect(last.engine.fuelLevel).toBeLessThan(first.engine.fuelLevel);
    });
  });
});
