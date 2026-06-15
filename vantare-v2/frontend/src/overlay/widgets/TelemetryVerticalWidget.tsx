import { useEffect, useMemo, useRef } from "react";
import { getWidgetTelemetrySource } from "./use-widget-telemetry";
import type { WidgetTelemetryMode } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";
import { setStylePropertyIfChanged, setTextIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";

type TelemetryVerticalProps = {
  editMode: boolean;
  telemetryMode?: WidgetTelemetryMode;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const BAKED_PANEL_BG = "linear-gradient(180deg, #1a0104 0%, #0d0102 100%)";
const BAKED_HEADER_BG = "linear-gradient(180deg, #9b2226 0%, #3a050a 100%)";
const BAKED_GEAR_BG = "linear-gradient(135deg, rgba(230,57,70,0.1) 0%, rgba(155,34,38,0.2) 100%)";
const RPM_MAX = 9000;

export function TelemetryVerticalWidget({ editMode, telemetryMode, updateHz = 30, props }: TelemetryVerticalProps) {
  const rpmBarRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const clutchBarRef = useRef<HTMLDivElement>(null);
  const brakeBarRef = useRef<HTMLDivElement>(null);
  const throttleBarRef = useRef<HTMLDivElement>(null);

  const { appearance: a } = resolveWidgetAppearance("telemetry-vertical", props);

  const getTelemetry = useMemo(
    () => getWidgetTelemetrySource(telemetryMode ?? (editMode ? "mock" : "live")),
    [editMode, telemetryMode],
  );

  useEffect(() => {
    return startFrameBudgetLoop(updateHz, () => {
      const t = getTelemetry();
      const rpmPct = Math.min(100, (t.rpm / RPM_MAX) * 100);

      if (rpmBarRef.current) {
        setStylePropertyIfChanged(rpmBarRef.current, "width", `${rpmPct}%`);
        let bg: string;
        let shadow: string;
        if (rpmPct > 95) {
          bg = "#FFFFFF";
          shadow = "0 0 15px #FFFFFF";
        } else if (rpmPct > 85) {
          bg = a.rpmRed;
          shadow = `0 0 10px ${a.rpmRed}`;
        } else if (rpmPct > 60) {
          bg = a.rpmYellow;
          shadow = `0 0 10px ${a.rpmYellow}`;
        } else {
          bg = a.rpmGreen;
          shadow = `0 0 10px ${a.rpmGreen}`;
        }
        setStylePropertyIfChanged(rpmBarRef.current, "backgroundColor", bg);
        setStylePropertyIfChanged(rpmBarRef.current, "boxShadow", shadow);
      }

      if (gearRef.current) setTextIfChanged(gearRef.current, String(t.gear));
      if (speedRef.current) setTextIfChanged(speedRef.current, String(Math.round(t.speed)));
      if (rpmTextRef.current) setTextIfChanged(rpmTextRef.current, String(Math.round(t.rpm)));

      if (clutchBarRef.current) setStylePropertyIfChanged(clutchBarRef.current, "height", `${t.clutch}%`);
      if (brakeBarRef.current) setStylePropertyIfChanged(brakeBarRef.current, "height", `${t.brake}%`);
      if (throttleBarRef.current) setStylePropertyIfChanged(throttleBarRef.current, "height", `${t.throttle}%`);
    });
  }, [updateHz, a.rpmGreen, a.rpmYellow, a.rpmRed, a.pedalThrottleColor, a.pedalBrakeColor, a.pedalClutchColor, getTelemetry]);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-lg font-display"
      style={{
        background: BAKED_PANEL_BG,
        border: `1px solid ${a.borderColor}`,
        color: a.textColor,
        opacity: a.opacity,
        boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
      }}
    >
      <div
        className="py-1 px-2 text-center"
        style={{ background: BAKED_HEADER_BG, borderBottom: "2px solid #1a0104" }}
      >
        <div className="text-[10px] font-black italic tracking-widest text-white">VANTARE TEL</div>
      </div>

      <div className="h-2 w-full relative" style={{ backgroundColor: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div
          ref={rpmBarRef}
          className="absolute left-0 top-0 h-full transition-all"
          style={{ width: "0%", backgroundColor: a.rpmGreen, boxShadow: `0 0 8px ${a.rpmGreen}` }}
        />
      </div>

      <div className="p-3 flex flex-col gap-3 flex-1">
        <div
          className="rounded-md flex flex-col items-center justify-center py-2 shadow-inner"
          style={{ background: BAKED_GEAR_BG, border: "1px solid #9b2226" }}
        >
          <span className="text-[9px] font-bold tracking-widest uppercase mb-[-8px]" style={{ color: a.accentColor }}>Gear</span>
          <span ref={gearRef} className="text-6xl font-black italic text-white drop-shadow-md font-tech">0</span>
        </div>

        <div
          className="rounded-md flex flex-col items-center justify-center py-2"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span ref={speedRef} className="text-4xl font-black italic text-white drop-shadow-md font-tech">0</span>
          <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-[-2px]">KM / H</span>
          <div className="w-full h-px bg-white/10 my-1" />
          <span ref={rpmTextRef} className="text-sm font-bold text-gray-300 font-tech">0 <span className="text-[8px] text-gray-500">RPM</span></span>
        </div>

        <div className="flex justify-center gap-3 h-32 mt-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-4 h-full relative overflow-hidden rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div ref={clutchBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalClutchColor, boxShadow: `0 0 10px ${a.pedalClutchColor}` }} />
            </div>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalClutchColor }}>CLU</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-full relative overflow-hidden rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div ref={brakeBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalBrakeColor, boxShadow: `0 0 10px ${a.pedalBrakeColor}` }} />
            </div>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalBrakeColor }}>BRK</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-full relative overflow-hidden rounded-sm" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div ref={throttleBarRef} className="absolute bottom-0 left-0 w-full transition-all" style={{ height: "0%", background: a.pedalThrottleColor, boxShadow: `0 0 10px ${a.pedalThrottleColor}` }} />
            </div>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: a.pedalThrottleColor }}>THR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
