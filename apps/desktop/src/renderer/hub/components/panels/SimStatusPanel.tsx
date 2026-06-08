import { useSimState } from '@vantare/ui-core';
import { StatusIndicator } from '../../../shared/components/StatusIndicator';

export default function SimStatusPanel() {
  const { connected, simName } = useSimState();

  return (
    <div className="space-y-3">
      {/* Connection status row */}
      <div className="flex items-center gap-2">
        <StatusIndicator
          status={connected ? 'connected' : 'disconnected'}
        />
        <span className="text-sm text-[var(--color-text)]">
          {connected && simName ? simName : 'No sim detected'}
        </span>
      </div>

      {/* Status badge */}
      <div>
        {connected ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            ● LIVE
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            ● OFFLINE
          </span>
        )}
      </div>

      {/* Info text */}
      <p className="text-xs text-[var(--color-text-muted)]">
        {connected ? 'Telemetry active' : 'Connect a simulator to begin'}
      </p>
    </div>
  );
}
