import { describe, it, expect } from 'vitest';
import { MockSimFactory } from '../mock-sim-factory';

describe('MockSimFactory', () => {
  it('should create iRacing provider', () => {
    const provider = MockSimFactory.create('iracing');
    expect(provider.name).toBe('iRacing');
    expect(provider.simType).toBe('iracing');
  });

  it('should create LMU provider', () => {
    const provider = MockSimFactory.create('lmu');
    expect(provider.name).toBe('LMU');
    expect(provider.simType).toBe('lmu');
  });

  it('should create AC provider', () => {
    const provider = MockSimFactory.create('ac');
    expect(provider.name).toBe('Assetto Corsa');
    expect(provider.simType).toBe('ac');
  });

  it('should create with specific scenario', () => {
    const provider = MockSimFactory.create('iracing', 'race');
    const data = provider.getData();
    expect(data.player.speed).toBeGreaterThanOrEqual(120);
    expect(data.player.speed).toBeLessThanOrEqual(300);
  });

  it('should return available sims', () => {
    const sims = MockSimFactory.getAvailableSims();
    expect(sims).toHaveLength(3);
    const ids = sims.map((s) => s.id);
    expect(ids).toContain('iracing');
    expect(ids).toContain('lmu');
    expect(ids).toContain('ac');
  });

  it('should create provider that supports setScenario', () => {
    const provider = MockSimFactory.create('iracing');
    provider.setScenario('qualifying');
    const data = provider.getData();
    expect(data.player.position).toBeGreaterThanOrEqual(1);
    expect(data.player.position).toBeLessThanOrEqual(5);
  });

  it('should generate unique data on each call', () => {
    const provider = MockSimFactory.create('race' as any);
  });
});
