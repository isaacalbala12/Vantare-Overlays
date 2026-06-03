/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────

// Mock the bundle registry so the shell test is decoupled from the actual
// bundle manifest, file moves, and component code. The shell only cares that
// the registry returns a `Bundle` shape with the four OverlayId keys.
vi.mock('../registry', () => ({
  loadBundle: vi.fn(async () => ({
    id: 'default',
    name: 'Default',
    components: {
      standings: () => <div data-testid="standings-component" />,
      relative: () => <div data-testid="relative-component" />,
      delta: () => <div data-testid="delta-component" />,
      'stream-alerts': () => <div data-testid="stream-alerts-component" />,
    },
  })),
  __resetBundleCache: vi.fn(),
}));

import OverlayShell from '../../overlays/OverlayShell';

// ── Helpers ─────────────────────────────────────────────────────────────────

function setUrl(search: string) {
  const url = new URL('http://localhost' + (search.startsWith('/') ? '' : '/') + search);
  Object.defineProperty(window, 'location', {
    value: {
      href: url.href,
      search: url.search,
      pathname: url.pathname,
    },
    writable: true,
    configurable: true,
  });
}

// ── Suite ───────────────────────────────────────────────────────────────────

describe('OverlayShell', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    setUrl('/');
    document.body.classList.remove('overlay-mode');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // ── Routing ────────────────────────────────────────────────────────────────

  it('renders Standings component for ?overlay=standings', async () => {
    setUrl('/?overlay=standings');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(container.innerHTML).toContain('data-testid="standings-component"');
  });

  it('renders Relative component for ?overlay=relative', async () => {
    setUrl('/?overlay=relative');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(container.innerHTML).toContain('data-testid="relative-component"');
  });

  it('renders Delta Bar (placeholder) component for ?overlay=delta', async () => {
    setUrl('/?overlay=delta');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    // The actual Delta Bar component lands in T3; the manifest currently maps
    // 'delta' to a placeholder so the shell can route to it today.
    expect(container.innerHTML).toContain('data-testid="delta-component"');
  });

  it('renders Stream Alerts (placeholder) component for ?overlay=stream-alerts', async () => {
    setUrl('/?overlay=stream-alerts');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(container.innerHTML).toContain('data-testid="stream-alerts-component"');
  });

  it('returns null when no overlay param is present', async () => {
    setUrl('/');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(container.innerHTML).toBe('');
  });

  it('returns null for unknown overlay id', async () => {
    setUrl('/?overlay=delta-bar');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(container.innerHTML).toBe('');
  });

  // ── Body class ─────────────────────────────────────────────────────────────

  it('applies overlay-mode class to body when overlay param is present', async () => {
    setUrl('/?overlay=standings');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(document.body.classList.contains('overlay-mode')).toBe(true);
  });

  it('removes overlay-mode class from body when no overlay param', async () => {
    setUrl('/');
    await act(async () => {
      root.render(<OverlayShell />);
    });
    expect(document.body.classList.contains('overlay-mode')).toBe(false);
  });
});
