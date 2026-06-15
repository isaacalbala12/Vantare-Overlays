import { useEffect, useMemo, useRef } from "react";
import { getWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";
import { setStylePropertyIfChanged, setTextIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";

type PedalsProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const BAKED_PANEL_BG = "linear-gradient(180deg, #1a0104 0%, #0d0102 100%)";
const HISTORY_SIZE = 100;

export function PedalsWidget({ editMode, updateHz = 30, props }: PedalsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const clutchBarRef = useRef<HTMLDivElement>(null);
  const brakeBarRef = useRef<HTMLDivElement>(null);
  const throttleBarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const steeringRef = useRef<SVGSVGElement>(null);
  const thrHistoryRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(0));
  const brkHistoryRef = useRef<number[]>(new Array(HISTORY_SIZE).fill(0));
  const steeringRef_ = useRef(0);
  const { appearance: a } = resolveWidgetAppearance("pedals", props);

  const getTelemetry = useMemo(() => getWidgetTelemetrySource(editMode), [editMode]);

  useEffect(() => {
    return startFrameBudgetLoop(updateHz, () => {
      const t = getTelemetry();

      if (gearRef.current) setTextIfChanged(gearRef.current, String(t.gear));
      if (speedRef.current) setTextIfChanged(speedRef.current, String(Math.round(t.speed)));

      if (clutchBarRef.current) setStylePropertyIfChanged(clutchBarRef.current, "height", `${t.clutch}%`);
      if (brakeBarRef.current) setStylePropertyIfChanged(brakeBarRef.current, "height", `${t.brake}%`);
      if (throttleBarRef.current) setStylePropertyIfChanged(throttleBarRef.current, "height", `${t.throttle}%`);

      // Smooth steering oscillation: advance phase by a fixed amount each frame.
      const target = Math.sin(steeringRef_.current) * 35;
      steeringRef_.current += (target - steeringRef_.current) * 0.25 + 0.05;
      if (steeringRef.current) {
        steeringRef.current.style.transform = `rotate(${steeringRef_.current}deg)`;
      }

      // Canvas trace
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const thrH = thrHistoryRef.current;
          const brkH = brkHistoryRef.current;
          thrH.push(t.throttle);
          thrH.shift();
          brkH.push(t.brake);
          brkH.shift();

          ctx.clearRect(0, 0, width, height);
          const stepX = width / (HISTORY_SIZE - 1);

          ctx.beginPath();
          ctx.strokeStyle = a.pedalThrottleColor;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 8;
          ctx.shadowColor = a.pedalThrottleColor;
          ctx.lineJoin = "round";
          for (let i = 0; i < HISTORY_SIZE; i++) {
            const x = i * stepX;
            const y = height - (thrH[i] / 100) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = a.pedalBrakeColor;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 8;
          ctx.shadowColor = a.pedalBrakeColor;
          for (let i = 0; i < HISTORY_SIZE; i++) {
            const x = i * stepX;
            const y = height - (brkH[i] / 100) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    });
  }, [updateHz, a.pedalThrottleColor, a.pedalBrakeColor, a.pedalClutchColor, getTelemetry]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex overflow-hidden font-display"
      style={{
        background: BAKED_PANEL_BG,
        border: "1px solid #9b2226",
        opacity: a.opacity,
        boxShadow: "0 10px 25px rgba(0,0,0,0.9)",
        borderRadius: "2px",
      }}
    >
      <div
        data-testid="pedals-gear"
        className="flex flex-col justify-center items-center shrink-0 relative z-30 pt-1"
        style={{
          width: "90px",
          background: a.accentColor,
          clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)",
          marginRight: "-12px",
        }}
      >
        <span ref={gearRef} className="text-[42px] font-black text-white italic drop-shadow-md leading-none ml-2">0</span>
        <span ref={speedRef} className="text-[11px] font-bold text-black bg-white px-2 rounded-sm tracking-widest italic leading-none py-[3px] mt-1 ml-2">0</span>
      </div>

      <div
        className="flex items-center justify-center z-20 gap-2"
        style={{
          paddingLeft: "28px",
          paddingRight: "12px",
          backgroundColor: "#0a0a0a",
          borderRight: "1px solid #333",
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-[14px] h-[46px] relative overflow-hidden" style={{ backgroundColor: "#000", transform: "skewX(-10deg)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div ref={clutchBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalClutchColor, boxShadow: `0 0 10px ${a.pedalClutchColor}` }} />
          </div>
          <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalClutchColor }}>CLU</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-[14px] h-[46px] relative overflow-hidden" style={{ backgroundColor: "#000", transform: "skewX(-10deg)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div ref={brakeBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalBrakeColor, boxShadow: `0 0 10px ${a.pedalBrakeColor}` }} />
          </div>
          <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalBrakeColor }}>BRK</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-[14px] h-[46px] relative overflow-hidden" style={{ backgroundColor: "#000", transform: "skewX(-10deg)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div ref={throttleBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalThrottleColor, boxShadow: `0 0 10px ${a.pedalThrottleColor}` }} />
          </div>
          <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalThrottleColor }}>THR</span>
        </div>
      </div>

      <div className="relative flex-1 z-10" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
          <svg
            ref={steeringRef}
            viewBox="0 0 100 100"
            className="w-12 h-12"
            style={{ opacity: 0.8, transform: "rotate(0deg)", transition: "transform 0.05s linear" }}
          >
            <path d="M 15 35 Q 50 10 85 35 L 90 65 Q 50 85 10 65 Z" fill="none" stroke="#fff" strokeWidth="6" />
            <path d="M 15 35 L 40 50 M 85 35 L 60 50 M 10 65 L 40 50 M 90 65 L 60 50" fill="none" stroke="#aaa" strokeWidth="5" />
            <rect x="40" y="20" width="20" height="4" fill="#C1121F" />
          </svg>
        </div>
        <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-10">
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
        </div>
        <canvas ref={canvasRef} className="absolute inset-0 z-10 opacity-90" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
