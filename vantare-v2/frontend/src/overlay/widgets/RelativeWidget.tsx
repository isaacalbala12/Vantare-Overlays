import { useEffect, useRef } from "react";
import { getTelemetryRef } from "../../lib/telemetry-ref";

type RelativeProps = {
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

export function RelativeWidget({ props }: RelativeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const rangeAhead = (props?.rangeAhead as number) ?? 3;
  const rangeBehind = (props?.rangeBehind as number) ?? 3;

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      const t = getTelemetryRef();
      const container = containerRef.current;
      if (!container) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      // Sort by place
      const sorted = [...t.vehicles].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

      // Find player
      const playerIdx = sorted.findIndex((v) => v.isPlayer);
      if (playerIdx === -1) {
        container.innerHTML = '<div class="text-white/30 text-xs font-mono p-2">No player</div>';
        frameId = requestAnimationFrame(tick);
        return;
      }

      // Slice relative window
      const start = Math.max(0, playerIdx - rangeAhead);
      const end = Math.min(sorted.length, playerIdx + rangeBehind + 1);
      const visible = sorted.slice(start, end);

      // Build HTML
      const rows = visible.map((v) => {
        const isP = v.isPlayer;
        const bgColor = isP ? "bg-white/10" : "";
        const textColor = isP ? "text-white" : "text-white/60";
        const gap = v.timeBehindLeader ?? 0;
        return `<div class="flex items-center gap-2 px-2 py-0.5 ${bgColor} ${textColor} text-xs font-mono">
          <span class="w-5 text-right text-white/40">${v.place ?? ""}</span>
          <span class="flex-1 truncate">${truncate(v.driverName ?? "?", 14)}</span>
          <span class="w-14 text-right text-white/40">${formatGap(gap)}</span>
        </div>`;
      });

      container.innerHTML = rows.join("");
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [rangeAhead, rangeBehind]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded">
      <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider px-2 py-1 border-b border-white/5">
        Relative
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
