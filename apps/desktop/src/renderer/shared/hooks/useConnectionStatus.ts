import { useEffect, useState, useCallback } from 'react';
import type { SimState } from '@vantare/sim-core';

interface ConnectionStatus {
  connected: boolean;
  simName: string | null;
  error: string | null;
}

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    simName: null,
    error: null,
  });

  const handleSimState = useCallback((state: SimState) => {
    setStatus({
      connected: state.connected,
      simName: state.name,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!window.vantare) return;

    const unsub = window.vantare.onSimState(handleSimState);
    return unsub;
  }, [handleSimState]);

  return status;
}
