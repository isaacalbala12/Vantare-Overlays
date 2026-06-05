import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/app-store';

describe('app-store', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAppStore.setState({
      demoMode: false,
      isLoading: true,
    });
  });

  it('initializes with demoMode = false', () => {
    const state = useAppStore.getState();
    expect(state.demoMode).toBe(false);
  });

  it('initializes with isLoading = true', () => {
    const state = useAppStore.getState();
    expect(state.isLoading).toBe(true);
  });

  it('setDemoMode updates demoMode correctly', () => {
    const { setDemoMode } = useAppStore.getState();
    setDemoMode(true);
    expect(useAppStore.getState().demoMode).toBe(true);

    setDemoMode(false);
    expect(useAppStore.getState().demoMode).toBe(false);
  });

  it('setIsLoading updates isLoading correctly', () => {
    const { setIsLoading } = useAppStore.getState();
    setIsLoading(false);
    expect(useAppStore.getState().isLoading).toBe(false);

    setIsLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);
  });
});
