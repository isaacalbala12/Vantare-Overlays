import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineerNotificationsWidget } from './EngineerNotificationsWidget';

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

describe('EngineerNotificationsWidget', () => {
  beforeEach(() => {
    runtimeMock.handlers.clear();
    runtimeMock.emit.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders placeholder in edit mode', () => {
    render(<EngineerNotificationsWidget editMode={true} />);
    expect(screen.getByTestId('engineer-placeholder')).toBeDefined();
    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });

  it('renders nothing in runtime mode when there is no active message', () => {
    const { container } = render(<EngineerNotificationsWidget editMode={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('engineer-placeholder')).toBeNull();
    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });

  it('displays active message and handles its expiration', () => {
    render(<EngineerNotificationsWidget editMode={false} />);

    const now = Date.now();
    const mockMsg = {
      id: 'notif-1',
      category: 'spotter',
      severity: 'info',
      textKey: 'spotter.car_left',
      text: 'Coche a la izquierda',
      priority: 100,
      createdAt: now,
      expiresAt: now + 2000,
      source: 'simulator',
    };

    dispatch('engineer:notification', mockMsg);

    expect(screen.getByTestId('engineer-notification-box')).toBeDefined();
    expect(screen.getByText('Coche a la izquierda')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });

  it('does not create listeners when transport="none"', () => {
    const eventsOnSize = runtimeMock.handlers.size;

    render(<EngineerNotificationsWidget editMode={false} transport="none" />);

    // No Events.On registered (mock handler map should not have grown)
    expect(runtimeMock.handlers.size).toBe(eventsOnSize);

    // Dispatching an event should not set active message since no listener was registered
    dispatch('engineer:notification', {
      id: 'notif-none',
      category: 'spotter',
      severity: 'info',
      text: 'Should be ignored',
      priority: 100,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5000,
      source: 'simulator',
    });

    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });

  it('uses Wails events when transport="wails"', () => {
    render(<EngineerNotificationsWidget editMode={false} transport="wails" />);

    const now = Date.now();
    dispatch('engineer:notification', {
      id: 'notif-wails',
      category: 'spotter',
      severity: 'info',
      text: 'Wails mode',
      priority: 100,
      createdAt: now,
      expiresAt: now + 5000,
      source: 'simulator',
    });

    expect(screen.getByTestId('engineer-notification-box')).toBeDefined();
  });

  it('uses __engineerTransport from props bag', () => {
    render(<EngineerNotificationsWidget editMode={false} props={{ __engineerTransport: 'none' }} />);

    const now = Date.now();
    dispatch('engineer:notification', {
      id: 'notif-none',
      category: 'spotter',
      severity: 'info',
      text: 'Should be ignored',
      priority: 100,
      createdAt: now,
      expiresAt: now + 5000,
      source: 'simulator',
    });

    // No message shown because transport="none" means no listener registered
    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });

  it('ignores message that is already expired when received', () => {
    render(<EngineerNotificationsWidget editMode={false} />);

    const now = Date.now();
    const mockMsg = {
      id: 'notif-2',
      category: 'spotter',
      severity: 'info',
      textKey: 'spotter.car_left',
      text: 'Coche a la izquierda',
      priority: 100,
      createdAt: now,
      expiresAt: now - 500,
      source: 'simulator',
    };

    dispatch('engineer:notification', mockMsg);

    expect(screen.queryByTestId('engineer-notification-box')).toBeNull();
  });
});
