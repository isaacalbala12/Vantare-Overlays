import { useEffect, useRef } from "react";
import { getTelemetryRef } from "../../lib/telemetry-ref";

type StandingsProps = {
  editMode: boolean;
  props?: Record<string, unknown>;
};

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}

function formatGap(timeBehind: number): string {
  if (timeBehind <= 0) return "Leader";
  return `+${timeBehind.toFixed(1)}s`;
}

export function StandingsWidget({ props }: StandingsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const maxRows = (props?.maxRows as number) ?? 12;

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      const t = getTelemetryRef();
      const container = containerRef.current;
      if (!container) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      // Sort by place, take top N
      const sorted = [...t.vehicles]
        .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
        .slice(0, maxRows);

      const rows = sorted.map((v) => {
        const isP = v.isPlayer;
        const bgColor = isP ? "bg-white/10" : "";
        const textColor = isP ? "text-white" : "text-white/60";
        const gap = v.timeBehindLeader ?? 0;
        return `<div class="flex items-center gap-2 px-2 py-0.5 ${bgColor} ${textColor} text-xs font-mono">
          <span class="w-5 text-right text-white/40">${v.place ?? ""}</span>
          <span class="flex-1 truncate">${truncate(v.driverName ?? "?", 16)}</span>
          <span class="w-14 text-right text-white/40">${formatGap(gap)}</span>
        </div>`;
      });

      container.innerHTML = rows.join("");
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [maxRows]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded">
      <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider px-2 py-1 border-b border-white/5">
        Standings
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
