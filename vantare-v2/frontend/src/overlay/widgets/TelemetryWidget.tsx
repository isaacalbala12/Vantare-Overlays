import { useEffect, useMemo, useRef } from "react";
import { getWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";
import { setHTMLIfChanged, setTextIfChanged, setStylePropertyIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";

type TelemetryProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const BAKED_PANEL_BG = "linear-gradient(180deg, #1a0104 0%, #0d0102 100%)";
const BAKED_HEADER_BG = "linear-gradient(180deg, #9b2226 0%, #3a050a 100%)";
const BAKED_GEAR_BG = "linear-gradient(135deg, rgba(230,57,70,0.1) 0%, rgba(155,34,38,0.2) 100%)";

const NUM_LEDS = 20;
const RPM_MAX = 9000;
const SHIFT_POINT = 8500;

function ledColor(i: number, rpmGreen: string, rpmYellow: string, rpmRed: string, rpmBlue: string): string {
  if (i >= 18) return rpmBlue;
  if (i >= 15) return rpmRed;
  if (i >= 10) return rpmYellow;
  return rpmGreen;
}

export function TelemetryWidget({ editMode, updateHz = 30, props }: TelemetryProps) {
  const ledsRef = useRef<HTMLDivElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const throttleBarRef = useRef<HTMLDivElement>(null);
  const throttleTextRef = useRef<HTMLSpanElement>(null);
  const brakeBarRef = useRef<HTMLDivElement>(null);
  const brakeTextRef = useRef<HTMLSpanElement>(null);

  const { appearance: a } = resolveWidgetAppearance("telemetry", props);

  const getTelemetry = useMemo(() => getWidgetTelemetrySource(editMode), [editMode]);

  useEffect(() => {
    let flashToggle = false;
    return startFrameBudgetLoop(updateHz, () => {
      const t = getTelemetry();
      const activeLeds = Math.round((t.rpm / RPM_MAX) * NUM_LEDS);
      const isShiftPoint = t.rpm > SHIFT_POINT;
      flashToggle = !flashToggle;

      // RPM LEDs
      if (ledsRef.current) {
        let ledsHtml = "";
        for (let i = 0; i < NUM_LEDS; i++) {
          const on = i < activeLeds;
          const flashWhite = isShiftPoint && i >= 18 && flashToggle;
          let bg: string;
          if (flashWhite) {
            bg = "#FFFFFF";
          } else if (on) {
            bg = ledColor(i, a.rpmGreen, a.rpmYellow, a.rpmRed, a.rpmBlue);
          } else {
            bg = "rgba(255,255,255,0.05)";
          }
          const shadow = on ? `0 0 8px ${bg}` : "none";
          ledsHtml += `<div class="flex-1 rounded-sm" style="background:${bg};box-shadow:${shadow};transition:all 0.05s ease"></div>`;
        }
        setHTMLIfChanged(ledsRef.current, ledsHtml);
      }

      if (rpmTextRef.current) setTextIfChanged(rpmTextRef.current, String(Math.round(t.rpm)));
      if (gearRef.current) setTextIfChanged(gearRef.current, String(t.gear));
      if (speedRef.current) setTextIfChanged(speedRef.current, String(Math.round(t.speed)));

      if (throttleBarRef.current) setStylePropertyIfChanged(throttleBarRef.current, "width", `${t.throttle}%`);
      if (throttleTextRef.current) setTextIfChanged(throttleTextRef.current, `${Math.round(t.throttle)}%`);
      if (brakeBarRef.current) setStylePropertyIfChanged(brakeBarRef.current, "width", `${t.brake}%`);
      if (brakeTextRef.current) setTextIfChanged(brakeTextRef.current, `${Math.round(t.brake)}%`);
    });
  }, [updateHz, a.rpmGreen, a.rpmYellow, a.rpmRed, a.rpmBlue, a.pedalThrottleColor, a.pedalBrakeColor, getTelemetry]);

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
        className="py-1 px-4 flex justify-between items-center"
        style={{ background: BAKED_HEADER_BG, borderBottom: "2px solid #1a0104" }}
      >
        <div className="text-xs font-black italic tracking-widest text-white">VANTARE TELEMETRY</div>
        <div className="text-[9px] font-mono font-bold text-white/70 tracking-widest">LIVE</div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* RPM BAR */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between px-1 text-[10px] font-bold text-gray-400 tracking-wider">
            <span>RPM</span>
            <span ref={rpmTextRef} className="text-white font-tech">0</span>
          </div>
          <div ref={ledsRef} data-testid="rpm-leds" className="flex gap-[2px] h-4 w-full" />
        </div>

        {/* GEAR & SPEED */}
        <div className="flex gap-4 h-24">
          <div
            className="rounded-md flex flex-col items-center justify-center w-2/5 shadow-inner"
            style={{ background: BAKED_GEAR_BG, border: "1px solid #9b2226" }}
          >
            <span className="text-[10px] font-bold tracking-widest uppercase mb-[-10px]" style={{ color: a.accentColor }}>Gear</span>
            <span ref={gearRef} className="text-6xl font-black italic text-white drop-shadow-md font-tech">0</span>
          </div>
          <div
            className="rounded-md flex flex-col items-center justify-center w-3/5"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span ref={speedRef} className="text-5xl font-black italic text-white drop-shadow-md font-tech">0</span>
            <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mt-[-5px]">KM / H</span>
          </div>
        </div>

        {/* PEDALS */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] font-bold tracking-widest text-right" style={{ color: a.pedalThrottleColor }}>THR</span>
            <div className="flex-1 h-3 rounded-sm relative overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div ref={throttleBarRef} className="absolute left-0 top-0 h-full transition-all" style={{ width: "0%", background: a.pedalThrottleColor, boxShadow: `0 0 10px ${a.pedalThrottleColor}` }} />
            </div>
            <span ref={throttleTextRef} className="w-8 text-[10px] font-mono text-gray-300 text-right">0%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] font-bold tracking-widest text-right" style={{ color: a.pedalBrakeColor }}>BRK</span>
            <div className="flex-1 h-3 rounded-sm relative overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div ref={brakeBarRef} className="absolute left-0 top-0 h-full transition-all" style={{ width: "0%", background: a.pedalBrakeColor, boxShadow: `0 0 10px ${a.pedalBrakeColor}` }} />
            </div>
            <span ref={brakeTextRef} className="w-8 text-[10px] font-mono text-gray-300 text-right">0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
