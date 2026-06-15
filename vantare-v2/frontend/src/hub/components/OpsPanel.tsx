import type { OpsMetrics } from "../../lib/ops-metrics";

type OpsPanelProps = {
  metrics: OpsMetrics | null;
};

function formatMB(value: number): string {
  return `${value.toFixed(1)} MB`;
}

export function OpsPanel({ metrics }: OpsPanelProps) {
  return (
    <section className="glass-panel rounded-xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-lg text-white">Ops</h3>
        <span className="text-[10px] uppercase tracking-widest text-vantare-textDim">
          1 Hz
        </span>
      </div>

      {!metrics ? (
        <p className="text-sm text-vantare-textMuted font-mono">Esperando métricas</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">RAM app</p>
            <p className="font-mono text-lg text-white">{formatMB(metrics.app.memoryMb)}</p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">CPU app</p>
            <p className="font-mono text-lg text-white">
              {metrics.app.cpuPercent === null ? "N/D" : `${metrics.app.cpuPercent.toFixed(1)}%`}
            </p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">Goroutines</p>
            <p className="font-mono text-lg text-white">{metrics.app.goroutines}</p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">Fuente</p>
            <p className="font-mono text-sm text-white truncate">{metrics.source.name}</p>
          </div>
        </div>
      )}
    </section>
  );
}
