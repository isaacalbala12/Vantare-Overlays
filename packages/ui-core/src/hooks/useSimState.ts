import { useEffect, useState } from 'react';

export function useSimState() {
  const [connected, setConnected] = useState(false);
  const [simName, setSimName] = useState<string | null>(null);

  useEffect(() => {
    if (window.vantare) {
      const unsub = window.vantare.onSimState((state: any) => {
        setConnected(state.connected);
        setSimName(state.name);
      });
      return unsub;
    }
  }, []);

  return { connected, simName };
}
