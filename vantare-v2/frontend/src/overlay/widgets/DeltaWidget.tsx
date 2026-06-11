import { useEffect, useRef } from "react";
import { getTelemetryRef } from "../../lib/telemetry-ref";

function formatDelta(delta: number): string {
  if (delta === 0) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}s`;
}

function deltaColor(delta: number): string {
  if (delta < 0) return "text-emerald-400"; // faster = green
  if (delta > 0) return "text-red-400"; // slower = red
  return "text-white/40";
}

function barWidth(delta: number): number {
  const abs = Math.min(Math.abs(delta), 5);
  return (abs / 5) * 100;
}

function barColor(delta: number): string {
  if (delta < 0) return "bg-emerald-400";
  if (delta > 0) return "bg-red-400";
  return "bg-white/20";
}

export function DeltaWidget(_props: { editMode: boolean }) {
  const deltaRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      const t = getTelemetryRef();
      if (deltaRef.current) {
        deltaRef.current.textContent = formatDelta(t.deltaBest);
        deltaRef.current.className = `font-mono text-sm font-bold ${deltaColor(t.deltaBest)}`;
      }
      if (fillRef.current) {
        const w = barWidth(t.deltaBest);
        fillRef.current.style.width = `${w}%`;
        fillRef.current.className = `h-full ${barColor(t.deltaBest)} transition-all duration-75`;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-center px-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Delta</span>
        <span ref={deltaRef} className="font-mono text-sm font-bold text-white/40">—</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div ref={fillRef} className="h-full bg-white/20 transition-all duration-75" />
      </div>
    </div>
  );
}
