/// <reference types="vitest" />

import { describe, it, expect, beforeEach } from 'vitest';
import { loadBundle, __resetBundleCache, getAvailableBundles } from '../registry';

describe('bundle registry', () => {
  beforeEach(() => {
    __resetBundleCache();
  });

  it('loads the default bundle', async () => {
    const bundle = await loadBundle('default');
    expect(bundle.id).toBe('default');
    expect(bundle.name).toBe('Default');
    expect(bundle.components.standings).toBeDefined();
    expect(bundle.components.relative).toBeDefined();
  });

  it('dedupes in-flight loads', async () => {
    const [a, b] = await Promise.all([loadBundle('default'), loadBundle('default')]);
    // Two concurrent loadBundle('default') calls must return the same cached Promise.
    // If dedup is broken, they would resolve to different dynamic-imports.
    expect(a).toBe(b);
  });

  it('falls back to default for missing theme', async () => {
    const bundle = await loadBundle('nonexistent-theme');
    expect(bundle.id).toBe('default');
  });

  it('exposes available bundles', () => {
    const available = getAvailableBundles();
    expect(available).toContain('default');
  });
});
