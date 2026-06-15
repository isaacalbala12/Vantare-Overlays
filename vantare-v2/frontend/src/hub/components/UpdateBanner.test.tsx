import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from './UpdateBanner';

type Handler = (event: { data: unknown }) => void;

const runtimeMock = vi.hoisted(() => ({
  handlers: new Map<string, Handler[]>(),
  emit: vi.fn(),
}));

vi.mock('@wailsio/runtime', () => ({
  Events: {
    On: (name: string, handler: Handler) => {
      runtimeMock.handlers.set(name, [...(runtimeMock.handlers.get(name) ?? []), handler]);
      return () =>
        runtimeMock.handlers.set(
          name,
          (runtimeMock.handlers.get(name) ?? []).filter((h) => h !== handler),
        );
    },
    Emit: runtimeMock.emit,
  },
}));

function dispatch(name: string, data: unknown) {
  act(() => {
    for (const handler of runtimeMock.handlers.get(name) ?? []) {
      handler({ data });
    }
  });
}

describe('UpdateBanner', () => {
  beforeEach(() => {
    runtimeMock.handlers.clear();
    runtimeMock.emit.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when no notification', () => {
    render(<UpdateBanner />);
    expect(screen.queryByText('Nueva versión disponible:')).toBeNull();
  });

  it('shows banner on updater:notify', () => {
    render(<UpdateBanner />);
    dispatch('updater:notify', {
      tag: 'v0.1.5-prealpha',
      name: 'v0.1.5',
      prerelease: true,
      downloadURL: 'https://example.com/installer.exe',
    });

    expect(screen.getByText('v0.1.5-prealpha')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Descargar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Saltar' })).toBeDefined();
  });

  it('emits ignore when skipping', () => {
    render(<UpdateBanner />);
    dispatch('updater:notify', {
      tag: 'v0.1.5-prealpha',
      name: 'v0.1.5',
      prerelease: true,
      downloadURL: 'https://example.com/installer.exe',
    });

    screen.getByRole('button', { name: 'Saltar' }).click();
    expect(runtimeMock.emit).toHaveBeenCalledWith('updater:ignore', { version: 'v0.1.5-prealpha' });
  });
});
