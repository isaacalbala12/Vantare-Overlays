import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TelemetryBridge } from '../TelemetryBridge';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@vantare/ui-core', () => ({
  useTelemetryStore: vi.fn((selector) => {
    const state = {
      telemetry: null,
      connected: false,
      error: null,
      isMock: false,
      setTelemetry: vi.fn(),
      setError: vi.fn(),
      setIsMock: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// ── Suite ──────────────────────────────────────────────────────────

describe('TelemetryBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      vantare: {
        onTelemetry: vi.fn(() => vi.fn()),
        onSimState: vi.fn(() => vi.fn()),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has no DOM output', () => {
    const html = renderToString(<TelemetryBridge />);
    expect(html).toBe('');
  });

  it('does not crash when rendered', () => {
    expect(() => renderToString(<TelemetryBridge />)).not.toThrow();
  });

  it('renders null (zero DOM)', () => {
    const html = renderToString(<TelemetryBridge />);
    // TelemetryBridge returns null → renderToString returns ''
    expect(html).toBe('');
  });
});
