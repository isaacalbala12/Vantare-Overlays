import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { OverlayContainer, LoadingSpinner, ErrorMessage, StatusIndicator } from '../components';

describe('OverlayContainer', () => {
  it('renders with children', () => {
    const el = renderToString(createElement(OverlayContainer, null, 'test'));
    expect(el).toBeTruthy();
    expect(el).toContain('test');
  });

  it('accepts className and style props', () => {
    const el = renderToString(
      createElement(OverlayContainer, { className: 'custom-class', style: { top: 10 } }, 'content'),
    );
    expect(el).toBeTruthy();
    expect(el).toContain('custom-class');
  });
});

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    const el = renderToString(createElement(LoadingSpinner));
    expect(el).toBeTruthy();
  });

  it('renders with all sizes', () => {
    expect(renderToString(createElement(LoadingSpinner, { size: 'sm' }))).toBeTruthy();
    expect(renderToString(createElement(LoadingSpinner, { size: 'md' }))).toBeTruthy();
    expect(renderToString(createElement(LoadingSpinner, { size: 'lg' }))).toBeTruthy();
  });

  it('renders an SVG with role="status"', () => {
    const el = renderToString(createElement(LoadingSpinner));
    expect(el).toBeTruthy();
    expect(el).toContain('role="status"');
  });

  it('uses provided aria-label', () => {
    const el = renderToString(createElement(LoadingSpinner, { label: 'Fetching data' }));
    expect(el).toBeTruthy();
    expect(el).toContain('Fetching data');
  });
});

describe('ErrorMessage', () => {
  it('displays the error message', () => {
    const el = renderToString(createElement(ErrorMessage, { message: 'Something went wrong' }));
    expect(el).toBeTruthy();
    expect(el).toContain('Something went wrong');
  });

  it('renders with retry button handler when onRetry is provided', () => {
    const onRetry = vi.fn();
    const el = renderToString(createElement(ErrorMessage, { message: 'Error', onRetry }));
    expect(el).toBeTruthy();
  });

  it('renders with error code when provided', () => {
    const el = renderToString(createElement(ErrorMessage, { message: 'Error', code: 'ERR_001' }));
    expect(el).toBeTruthy();
    expect(el).toContain('ERR_001');
  });

  it('has role="alert" for accessibility', () => {
    const el = renderToString(createElement(ErrorMessage, { message: 'Error' }));
    expect(el).toBeTruthy();
    expect(el).toContain('role="alert"');
  });
});

describe('StatusIndicator', () => {
  it('renders with connected status', () => {
    expect(renderToString(createElement(StatusIndicator, { status: 'connected' }))).toBeTruthy();
  });

  it('renders with disconnected status', () => {
    expect(renderToString(createElement(StatusIndicator, { status: 'disconnected' }))).toBeTruthy();
  });

  it('renders with error status', () => {
    expect(renderToString(createElement(StatusIndicator, { status: 'error' }))).toBeTruthy();
  });

  it('renders with label text', () => {
    const el = renderToString(createElement(StatusIndicator, { status: 'connected', label: 'iRacing' }));
    expect(el).toBeTruthy();
    expect(el).toContain('iRacing');
  });

  it('sets aria-label for accessibility', () => {
    const el = renderToString(createElement(StatusIndicator, { status: 'connected', label: 'Connected to sim' }));
    expect(el).toBeTruthy();
    expect(el).toContain('Connected to sim');
  });
});