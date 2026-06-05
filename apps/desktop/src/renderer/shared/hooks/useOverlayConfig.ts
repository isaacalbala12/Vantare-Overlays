import { useEffect, useState, useCallback } from 'react';
import type { OverlayConfig } from '@vantare/types';

export function useOverlayConfig(overlayId: string): OverlayConfig | null {
  const [config, setConfig] = useState<OverlayConfig | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const profile = await window.vantare.getActiveProfile();
      if (profile?.overlays?.[overlayId]) {
        setConfig(profile.overlays[overlayId]);
      } else {
        setConfig(null);
      }
    } catch {
      setConfig(null);
    }
  }, [overlayId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return config;
}
