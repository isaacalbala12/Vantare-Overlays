import { create } from 'zustand';

interface AppState {
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  demoMode: false,
  setDemoMode: (enabled) => set({ demoMode: enabled }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
