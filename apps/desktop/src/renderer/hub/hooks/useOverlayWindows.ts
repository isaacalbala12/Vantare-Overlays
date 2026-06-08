import { useState, useEffect, useCallback } from 'react';

interface OverlayWindowState {
  total: number;
  active: number;
}

export function useOverlayWindows() {
  const [state, setState] = useState<OverlayWindowState>({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const windows = await window.vantare.getOverlayWindows();
      const profiles = await window.vantare.getActiveProfile();
      const total = profiles?.overlays ? Object.keys(profiles.overlays).length : 0;
      setState({ total, active: windows.length });
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAll = useCallback(async () => {
    try {
      // IPC call — placeholder for overlay service
      // Actual open/close is handled by the overlay service
    } catch {
      // Graceful degradation
    }
  }, []);

  const closeAll = useCallback(async () => {
    try {
      // IPC call — placeholder
    } catch {
      // Graceful degradation
    }
  }, []);

  return { ...state, loading, openAll, closeAll, refresh };
}
