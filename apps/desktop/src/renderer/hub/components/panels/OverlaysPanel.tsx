import { useOverlayWindows } from '../../hooks/useOverlayWindows';

export default function OverlaysPanel() {
  const { total, active, loading, openAll, closeAll } = useOverlayWindows();

  return (
    <div className="space-y-3">
      {/* Count badge */}
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-[var(--color-text)]">
          {loading ? '—' : `${active}`}
          <span className="text-sm font-normal text-[var(--color-text-muted)]"> / {total} active</span>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.preventDefault(); openAll(); }}
          disabled={total === 0 || active === total}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Open All
        </button>
        <button
          onClick={(e) => { e.preventDefault(); closeAll(); }}
          disabled={active === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Close All
        </button>
      </div>

      {/* Empty state */}
      {total === 0 && !loading && (
        <p className="text-xs text-[var(--color-text-muted)]">No overlays configured</p>
      )}
    </div>
  );
}
