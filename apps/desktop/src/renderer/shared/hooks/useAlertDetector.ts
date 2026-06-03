import { useEffect, useRef } from 'react';
import type { Telemetry } from '@vantare/sim-core';
import { useAlertsStore } from '../stores/alerts-store';
import type { Alert } from '../types/alerts';

interface PrevState {
  playerPosition: number | null;
  isSessionBest: boolean;
  isConnected: boolean;
}

const POLE_SESSION_TYPE = 'Qualifying';

export function useAlertDetector(telemetry: Telemetry | null): void {
  const prev = useRef<PrevState>({
    playerPosition: null,
    isSessionBest: false,
    isConnected: false,
  });
  const enqueueAlert = useAlertsStore((s) => s.enqueueAlert);
  const clearQueue = useAlertsStore((s) => s.clearQueue);

  useEffect(() => {
    if (!telemetry) {
      return;
    }

    // Telemetry disconnect → drain queue (only on transition)
    if (!telemetry.isConnected) {
      if (prev.current.isConnected) {
        clearQueue();
      }
      prev.current.isConnected = false;
      return;
    }
    prev.current.isConnected = true;

    const player = telemetry.vehicles.find((v) => v.isPlayer);
    if (!player) {
      return;
    }

    const newPosition = player.position;
    const prevPosition = prev.current.playerPosition;
    const newIsSessionBest = telemetry.lap.isSessionBest;
    const prevIsSessionBest = prev.current.isSessionBest;

    // First render: record initial state, no alerts
    if (prevPosition === null) {
      prev.current.playerPosition = newPosition;
      prev.current.isSessionBest = newIsSessionBest;
      return;
    }

    // ── Overtake: player moved up (position number decreased) ───────────
    if (prevPosition > newPosition && telemetry.vehicles.length > 1) {
      const overtaken = telemetry.vehicles.find((v) => v.position === prevPosition - 1);
      const alert: Alert = {
        id: `${telemetry.timestamp}-overtake`,
        type: 'overtake',
        timestamp: telemetry.timestamp,
        message: `Overtook ${overtaken?.driverName ?? 'driver'}`,
        data: { victim: overtaken?.id ?? null, newPosition },
      };
      enqueueAlert(alert);
    }

    // ── Pole: Qualifying session AND player reached P1 ───────────────────
    if (
      telemetry.session.type === POLE_SESSION_TYPE &&
      newPosition === 1 &&
      prevPosition !== 1
    ) {
      const alert: Alert = {
        id: `${telemetry.timestamp}-pole`,
        type: 'pole',
        timestamp: telemetry.timestamp,
        message: 'Pole position!',
        data: { position: 1 },
      };
      enqueueAlert(alert);
    }

    // ── Fastest lap: isSessionBest transitioned false → true ─────────────
    if (newIsSessionBest && !prevIsSessionBest) {
      const alert: Alert = {
        id: `${telemetry.timestamp}-fastest_lap`,
        type: 'fastest_lap',
        timestamp: telemetry.timestamp,
        message: 'Fastest lap!',
        data: { lapTime: telemetry.lap.lastLaptime },
      };
      enqueueAlert(alert);
    }

    prev.current.playerPosition = newPosition;
    prev.current.isSessionBest = newIsSessionBest;
  }, [telemetry, enqueueAlert, clearQueue]);
}
