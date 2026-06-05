import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DebugOverlay } from '../DebugOverlay';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@vantare/ui-core', () => ({
  useTelemetryStore: vi.fn((selector) => {
    const state = { telemetry: null };
    return selector ? selector(state) : state;
  }),
}));

function mockWindow() {
  const storage: Record<string, string> = {};
  vi.stubGlobal('window', {
    location: { search: '', href: 'http://localhost/' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  });
  vi.stubGlobal('URLSearchParams', URLSearchParams);
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

// ── Suite ──────────────────────────────────────────────────────────

describe('DebugOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 4 metric labels when visible via ?debug=true', () => {
    window.location.search = '?debug=true';

    const html = renderToString(<DebugOverlay />);
    expect(html).toContain('DEBUG');
    expect(html).toContain('FPS');
    expect(html).toContain('Latency');
    expect(html).toContain('Memory');
    expect(html).toContain('Re-renders');
  });

  it('is hidden by default without ?debug=true', () => {
    const html = renderToString(<DebugOverlay />);
    expect(html).toBe('');
  });

  it('renders nothing in production', () => {
    process.env.NODE_ENV = 'production';

    const html = renderToString(<DebugOverlay />);
    expect(html).toBe('');

    process.env.NODE_ENV = 'test';
  });
});
