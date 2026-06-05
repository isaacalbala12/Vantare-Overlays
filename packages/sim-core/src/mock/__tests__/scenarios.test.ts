import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS } from '../scenarios';

const SCENARIOS = ['practice', 'qualifying', 'race', 'pit-stop', 'crash', 'formation-lap'] as const;

describe('ScenarioConfigs', () => {
  it('should have configs for all 6 scenarios', () => {
    const keys = Object.keys(SCENARIO_CONFIGS);
    expect(keys).toHaveLength(6);
    for (const s of SCENARIOS) {
      expect(SCENARIO_CONFIGS[s]).toBeDefined();
    }
  });

  describe('practice', () => {
    const cfg = SCENARIO_CONFIGS.practice;

    it('should have speed range 100-250 km/h', () => {
      expect(cfg.speedMin).toBe(100);
      expect(cfg.speedMax).toBe(250);
    });

    it('should have fuel near full', () => {
      expect(cfg.fuelBehavior).toBe('full');
    });

    it('should have null position (N/A)', () => {
      expect(cfg.positionRange).toBeNull();
    });

    it('should have traffic', () => {
      expect(cfg.hasTraffic).toBe(true);
    });

    it('should have green flags', () => {
      expect(cfg.flags).toContain('green');
    });
  });

  describe('qualifying', () => {
    const cfg = SCENARIO_CONFIGS.qualifying;

    it('should have speed range 150-320 km/h', () => {
      expect(cfg.speedMin).toBe(150);
      expect(cfg.speedMax).toBe(320);
    });

    it('should have low fuel (qualifying run)', () => {
      expect(cfg.fuelBehavior).toBe('low');
    });

    it('should have position range 1-5', () => {
      expect(cfg.positionRange).toEqual([1, 5]);
    });

    it('should have no traffic', () => {
      expect(cfg.hasTraffic).toBe(false);
    });
  });

  describe('race', () => {
    const cfg = SCENARIO_CONFIGS.race;

    it('should have speed range 120-300 km/h', () => {
      expect(cfg.speedMin).toBe(120);
      expect(cfg.speedMax).toBe(300);
    });

    it('should have decreasing fuel', () => {
      expect(cfg.fuelBehavior).toBe('decreasing');
    });

    it('should have position range 1-20', () => {
      expect(cfg.positionRange).toEqual([1, 20]);
    });

    it('should have traffic', () => {
      expect(cfg.hasTraffic).toBe(true);
    });

    it('should have max vehicle count (25)', () => {
      expect(cfg.vehicleCount).toBe(25);
    });
  });

  describe('pit-stop', () => {
    const cfg = SCENARIO_CONFIGS['pit-stop'];

    it('should have low speed range 0-60 km/h', () => {
      expect(cfg.speedMin).toBe(0);
      expect(cfg.speedMax).toBe(60);
    });

    it('should have increasing fuel (being refilled)', () => {
      expect(cfg.fuelBehavior).toBe('increasing');
    });

    it('should be in pit', () => {
      expect(cfg.isPit).toBe(true);
      expect(cfg.isPitting).toBe(true);
    });

    it('should not be on track', () => {
      expect(cfg.isOnTrack).toBe(false);
    });
  });

  describe('crash', () => {
    const cfg = SCENARIO_CONFIGS.crash;

    it('should have 0 speed', () => {
      expect(cfg.speedMin).toBe(0);
      expect(cfg.speedMax).toBe(0);
    });

    it('should have yellow and debris flags', () => {
      expect(cfg.flags).toContain('yellow');
      expect(cfg.flags).toContain('debris');
    });

    it('should not be on track', () => {
      expect(cfg.isOnTrack).toBe(false);
    });
  });

  describe('formation-lap', () => {
    const cfg = SCENARIO_CONFIGS['formation-lap'];

    it('should have speed range 60-120 km/h', () => {
      expect(cfg.speedMin).toBe(60);
      expect(cfg.speedMax).toBe(120);
    });

    it('should have full fuel', () => {
      expect(cfg.fuelBehavior).toBe('full');
    });

    it('should have no passing (no traffic)', () => {
      expect(cfg.hasTraffic).toBe(false);
    });

    it('should have yellow flags', () => {
      expect(cfg.flags).toContain('yellow');
    });
  });
});
