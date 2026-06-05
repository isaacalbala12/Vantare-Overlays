import { describe, expect, it } from 'vitest';
import {
  ProfileSchema,
  ProfilesSchema,
  OverlayConfigDiscriminatedSchema,
  DeltaBarConfigSchema,
  StreamAlertsConfigSchema,
  StandingsConfigSchema,
  RelativeConfigSchema,
} from '../index';

// ── Helpers ──────────────────────────────────────────────────────────────────

function validStandings() {
  return {
    overlayId: 'standings' as const,
    rowCount: 20,
    showMulticlass: true,
    showGaps: true,
    showLastLap: true,
    showBestLap: true,
    columns: ['position', 'name', 'gap', 'lastLap'],
    opacity: 1,
  };
}

function validRelative() {
  return {
    overlayId: 'relative' as const,
    rangeAhead: 3,
    rangeBehind: 3,
    showGaps: true,
    colorCoding: true,
    opacity: 1,
  };
}

function validDeltaBar() {
  return {
    overlayId: 'delta-bar' as const,
    showDelta: true,
    showPrediction: false,
    barPosition: 'top' as const,
    opacity: 0.8,
  };
}

function validStreamAlerts() {
  return {
    overlayId: 'stream-alerts' as const,
    enabled: true,
    duration: 8,
    position: 'top-right' as const,
    queueCap: 5,
  };
}

// ── Test 1: ProfileSchema.parse with valid profile (all 4 overlays) ──────────

describe('ProfileSchema', () => {
  it('accepts valid profile with all 4 overlay types', () => {
    const profile = {
      id: 'profile-001',
      name: 'My Racing Profile',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-06-01T08:30:00Z',
      overlays: {
        standings: validStandings(),
        relative: validRelative(),
        'delta-bar': validDeltaBar(),
        'stream-alerts': validStreamAlerts(),
      },
      themeId: 'dark',
    };

    const result = ProfileSchema.parse(profile);
    expect(result.id).toBe('profile-001');
    expect(result.name).toBe('My Racing Profile');
    expect(Object.keys(result.overlays)).toHaveLength(4);
    expect(result.overlays.standings.overlayId).toBe('standings');
    expect(result.overlays.relative.overlayId).toBe('relative');
    expect(result.overlays['delta-bar'].overlayId).toBe('delta-bar');
    expect(result.overlays['stream-alerts'].overlayId).toBe('stream-alerts');
  });

  it('rejects empty name', () => {
    const profile = {
      id: 'profile-002',
      name: '',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-06-01T08:30:00Z',
      overlays: {},
      themeId: 'dark',
    };
    expect(() => ProfileSchema.parse(profile)).toThrow();
  });

  it('rejects name exceeding 100 characters', () => {
    const profile = {
      id: 'profile-003',
      name: 'A'.repeat(101),
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-06-01T08:30:00Z',
      overlays: {},
      themeId: 'dark',
    };
    expect(() => ProfileSchema.parse(profile)).toThrow();
  });
});

// ── Test 2: safeParse with invalid overlay ───────────────────────────────────

describe('ProfileSchema.safeParse with invalid overlay', () => {
  it('returns success=false when overlay config has invalid field (rowCount=999)', () => {
    const profile = {
      id: 'profile-bad',
      name: 'Bad Profile',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-06-01T08:30:00Z',
      overlays: {
        standings: {
          overlayId: 'standings',
          rowCount: 999, // invalid: max is 40
          showMulticlass: true,
          showGaps: true,
          showLastLap: true,
          showBestLap: true,
          columns: ['position', 'name', 'gap', 'lastLap'],
          opacity: 1,
        },
      },
      themeId: 'dark',
    };

    const result = ProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('returns success=false when overlay config has wrong overlayId discriminator', () => {
    const profile = {
      id: 'profile-bad2',
      name: 'Bad Profile 2',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-06-01T08:30:00Z',
      overlays: {
        standings: {
          overlayId: 'nonexistent', // invalid discriminator
          rowCount: 20,
          showMulticlass: true,
          showGaps: true,
          showLastLap: true,
          showBestLap: true,
          columns: ['position', 'name', 'gap', 'lastLap'],
          opacity: 1,
        },
      },
      themeId: 'dark',
    };

    const result = ProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });
});

// ── Test 3: OverlayConfigDiscriminatedSchema.parse each type ─────────────────

describe('OverlayConfigDiscriminatedSchema', () => {
  it('parses standings config', () => {
    const result = OverlayConfigDiscriminatedSchema.parse(validStandings());
    expect(result.overlayId).toBe('standings');
  });

  it('parses relative config', () => {
    const result = OverlayConfigDiscriminatedSchema.parse(validRelative());
    expect(result.overlayId).toBe('relative');
  });

  it('parses delta-bar config', () => {
    const result = OverlayConfigDiscriminatedSchema.parse(validDeltaBar());
    expect(result.overlayId).toBe('delta-bar');
  });

  it('parses stream-alerts config', () => {
    const result = OverlayConfigDiscriminatedSchema.parse(validStreamAlerts());
    expect(result.overlayId).toBe('stream-alerts');
  });

  it('rejects config with unknown overlayId', () => {
    expect(() =>
      OverlayConfigDiscriminatedSchema.parse({
        overlayId: 'unknown-type',
        someField: 'value',
      }),
    ).toThrow();
  });

  it('rejects config missing the overlayId discriminator', () => {
    expect(() =>
      OverlayConfigDiscriminatedSchema.parse({
        rowCount: 20,
        showMulticlass: true,
      }),
    ).toThrow();
  });
});

// ── Test 4: DeltaBarConfigSchema ─────────────────────────────────────────────

describe('DeltaBarConfigSchema', () => {
  it('accepts valid config', () => {
    const result = DeltaBarConfigSchema.parse(validDeltaBar());
    expect(result.showDelta).toBe(true);
    expect(result.showPrediction).toBe(false);
    expect(result.barPosition).toBe('top');
    expect(result.opacity).toBe(0.8);
  });

  it('accepts bottom position', () => {
    const result = DeltaBarConfigSchema.parse({
      overlayId: 'delta-bar',
      showDelta: true,
      showPrediction: true,
      barPosition: 'bottom',
      opacity: 0.5,
    });
    expect(result.barPosition).toBe('bottom');
  });

  it('rejects opacity below 0', () => {
    expect(() =>
      DeltaBarConfigSchema.parse({
        overlayId: 'delta-bar',
        showDelta: true,
        showPrediction: true,
        barPosition: 'top',
        opacity: -0.1,
      }),
    ).toThrow();
  });

  it('rejects opacity above 1', () => {
    expect(() =>
      DeltaBarConfigSchema.parse({
        overlayId: 'delta-bar',
        showDelta: true,
        showPrediction: true,
        barPosition: 'top',
        opacity: 1.5,
      }),
    ).toThrow();
  });

  it('rejects invalid barPosition', () => {
    expect(() =>
      DeltaBarConfigSchema.parse({
        overlayId: 'delta-bar',
        showDelta: true,
        showPrediction: true,
        barPosition: 'left',
        opacity: 0.5,
      }),
    ).toThrow();
  });
});

// ── Test 5: StreamAlertsConfigSchema ─────────────────────────────────────────

describe('StreamAlertsConfigSchema', () => {
  it('accepts valid config', () => {
    const result = StreamAlertsConfigSchema.parse(validStreamAlerts());
    expect(result.enabled).toBe(true);
    expect(result.duration).toBe(8);
    expect(result.position).toBe('top-right');
    expect(result.queueCap).toBe(5);
  });

  it('accepts all positions', () => {
    const positions = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const;
    for (const position of positions) {
      const result = StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 5,
        position,
        queueCap: 3,
      });
      expect(result.position).toBe(position);
    }
  });

  it('rejects duration below 3', () => {
    expect(() =>
      StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 2,
        position: 'top-center',
        queueCap: 5,
      }),
    ).toThrow();
  });

  it('rejects duration above 15', () => {
    expect(() =>
      StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 16,
        position: 'top-center',
        queueCap: 5,
      }),
    ).toThrow();
  });

  it('rejects queueCap below 1', () => {
    expect(() =>
      StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 5,
        position: 'top-center',
        queueCap: 0,
      }),
    ).toThrow();
  });

  it('rejects queueCap above 10', () => {
    expect(() =>
      StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 5,
        position: 'top-center',
        queueCap: 11,
      }),
    ).toThrow();
  });

  it('rejects invalid position', () => {
    expect(() =>
      StreamAlertsConfigSchema.parse({
        overlayId: 'stream-alerts',
        enabled: true,
        duration: 5,
        position: 'center',
        queueCap: 5,
      }),
    ).toThrow();
  });
});

// ── ProfilesSchema ───────────────────────────────────────────────────────────

describe('ProfilesSchema', () => {
  it('accepts an array of profiles', () => {
    const profiles = [
      {
        id: 'profile-001',
        name: 'Profile One',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-01T08:30:00Z',
        overlays: {},
        themeId: 'dark',
      },
      {
        id: 'profile-002',
        name: 'Profile Two',
        createdAt: '2025-02-20T12:00:00Z',
        updatedAt: '2025-06-02T09:00:00Z',
        overlays: {},
        themeId: 'blood',
      },
    ];

    const result = ProfilesSchema.parse(profiles);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Profile One');
    expect(result[1].name).toBe('Profile Two');
  });
});
