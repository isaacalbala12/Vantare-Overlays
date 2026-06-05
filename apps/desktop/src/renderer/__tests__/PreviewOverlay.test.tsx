import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PreviewOverlay } from '../PreviewOverlay';

describe('PreviewOverlay', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders metrics in dev mode', () => {
    const html = renderToString(<PreviewOverlay />);

    expect(html).toContain('Updates');
    expect(html).toContain('Frame');
    expect(html).toContain('Renders');
  });

  it('shows initial numeric metric values', () => {
    const html = renderToString(<PreviewOverlay />);

    // React SSR inserts <!-- --> between adjacent text nodes,
    // so check that the <span> wrapping the value contains the number.
    expect(html).toMatch(/0.*\/s/);
    expect(html).toMatch(/0.*ms/);
    expect(html).toContain('>1<');
  });

  it('renders nothing in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const html = renderToString(<PreviewOverlay />);

    expect(html).toBe('');
  });

  it('has data-testid attribute', () => {
    const html = renderToString(<PreviewOverlay />);

    expect(html).toContain('data-testid="preview-overlay"');
  });
});
