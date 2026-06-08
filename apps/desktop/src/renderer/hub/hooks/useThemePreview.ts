import { useState, useEffect } from 'react';
import type { Theme } from '@vantare/types';

interface ThemePreviewState {
  activeTheme: Theme | null;
  allThemes: Theme[];
  loading: boolean;
}

export function useThemePreview() {
  const [state, setState] = useState<ThemePreviewState>({
    activeTheme: null,
    allThemes: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [activeTheme, allThemes] = await Promise.all([
          window.vantare.getActiveTheme(),
          window.vantare.getThemes(),
        ]);
        if (!cancelled) {
          setState({ activeTheme, allThemes, loading: false });
        }
      } catch {
        if (!cancelled) {
          setState({ activeTheme: null, allThemes: [], loading: false });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
