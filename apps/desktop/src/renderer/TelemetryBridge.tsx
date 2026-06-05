import { useEffect } from 'react';
import { useTelemetryStore } from '@vantare/ui-core';
import type { Telemetry, SimState } from '@vantare/sim-core';

export function TelemetryBridge() {
  const setTelemetry = useTelemetryStore((s) => s.setTelemetry);
  const setConnected = useTelemetryStore((s) => s.setConnected);
  const setError = useTelemetryStore((s) => s.setError);
  const setIsMock = useTelemetryStore((s) => s.setIsMock);

  useEffect(() => {
    if (!window.vantare) return;

    const unsubTelemetry = window.vantare.onTelemetry((data: Telemetry) => {
      setTelemetry(data);
    });

    const unsubSimState = window.vantare.onSimState((state: SimState) => {
      setConnected(state.connected ?? false);
      setIsMock(state.isMock ?? false);
    });

    return () => {
      unsubTelemetry();
      unsubSimState();
    };
  }, [setTelemetry, setConnected, setError, setIsMock]);

  return null; // Zero DOM
}