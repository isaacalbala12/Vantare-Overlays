// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useOverlayConfig } from '../hooks/useOverlayConfig';
import type { VantareBridge } from '@vantare/types';

function createMockEnvironment() {
  const listeners: Array<(...args: unknown[]) => void> = [];

  const mockVantare: Partial<VantareBridge> = {
    onSimState: vi.fn((cb) => {
      listeners.push(cb);
      const index = listeners.length - 1;
      return () => {
        listeners.splice(index, 1);
      };
    }),
    getActiveProfile: vi.fn(),
  };

  window.vantare = mockVantare as unknown as VantareBridge;

  return {
    mockVantare,
    listeners,
    emitSimState: (state: { type: string | null; connected: boolean; name: string }) => {
      listeners.forEach((cb) => cb(state));
    },
  };
}

describe('useConnectionStatus', () => {
  beforeEach(() => {
    createMockEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial disconnected state with no sim and no error', () => {
    function StatusRenderer() {
      const status = useConnectionStatus();
      return createElement('div', null,
        `connected:${status.connected}`,
        `simName:${status.simName ?? 'null'}`,
        `error:${status.error ?? 'null'}`
      );
    }
    const html = renderToString(createElement(StatusRenderer));
    expect(html).toContain('connected:false');
    expect(html).toContain('simName:null');
    expect(html).toContain('error:null');
  });

  it('is a function that takes no arguments', () => {
    expect(typeof useConnectionStatus).toBe('function');
    expect(useConnectionStatus.length).toBe(0);
  });
});

describe('useOverlayConfig', () => {
  beforeEach(() => {
    window.vantare = {
      getActiveProfile: vi.fn(),
    } as unknown as VantareBridge;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a function that takes an overlayId argument', () => {
    expect(typeof useOverlayConfig).toBe('function');
    expect(useOverlayConfig.length).toBe(1);
  });

  it('returns null initially (sync render before async effect)', () => {
    function ConfigRenderer() {
      const config = useOverlayConfig('standings');
      return createElement('div', null, `config:${(config ?? 'null') as string}`);
    }
    const html = renderToString(createElement(ConfigRenderer));
    expect(html).toContain('>config:null<');
  });

  it('returns null for invalid overlay IDs', () => {
    function ConfigRenderer() {
      const config = useOverlayConfig('');
      return createElement('div', null, `config:${(config ?? 'null') as string}`);
    }
    const html = renderToString(createElement(ConfigRenderer));
    expect(html).toContain('>config:null<');
  });
});
