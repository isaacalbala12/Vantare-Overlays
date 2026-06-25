import { useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { EngineerNotification } from "../../engineer/engineer-types";

type EngineerNotificationsWidgetProps = {
  editMode: boolean;
  telemetryMode?: "live" | "mock";
  updateHz?: number;
  props?: Record<string, unknown>;
  /** Explicit transport selector: "none" = no listeners, "wails" = Wails events, "sse" = EventSource.
   *  When omitted, falls back to URL-path heuristic for backward compatibility. */
  transport?: "wails" | "sse" | "none";
};

function resolveTransport(props: Record<string, unknown> | undefined, explicit?: "wails" | "sse" | "none"): "wails" | "sse" | "none" {
  if (explicit) return explicit;
  const fromProps = (props as Record<string, unknown> | undefined)?.["__engineerTransport"];
  if (fromProps === "wails" || fromProps === "sse" || fromProps === "none") return fromProps;
  // Fallback heuristic: SSE when URL looks like OBS overlay
  if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
    if (window.location.pathname.includes("/overlay") || window.location.search.includes("profile=")) {
      return "sse";
    }
  }
  return "wails";
}

export function EngineerNotificationsWidget({
  editMode,
  telemetryMode = "live",
  props,
  transport: explicitTransport,
}: EngineerNotificationsWidgetProps) {
  const [activeMsg, setActiveMsg] = useState<EngineerNotification | null>(null);

  useEffect(() => {
    let disposed = false;
    let es: EventSource | null = null;
    let unsubNotification: (() => void) | null = null;

    const transport = resolveTransport(props, explicitTransport);

    if (transport === "sse" && telemetryMode === "live") {
      // OBS Mode: Connect to SSE stream
      es = new EventSource("/engineer/stream");
      es.addEventListener("engineer-notification", (event: MessageEvent) => {
        if (disposed) return;
        try {
          const notif = JSON.parse(event.data) as EngineerNotification;
          if (!notif.expiresAt || notif.expiresAt > Date.now()) {
            setActiveMsg(notif);
          }
        } catch (err) {
          console.error("Failed to parse engineer notification SSE", err);
        }
      });
      es.onerror = () => {
        console.warn("Engineer SSE stream connection error");
      };
    } else if (transport === "wails") {
      // Wails Mode: Listen to Wails Events
      unsubNotification = Events.On("engineer:notification", (event: { data: EngineerNotification }) => {
        if (disposed) return;
        const notif = event.data;
        if (!notif.expiresAt || notif.expiresAt > Date.now()) {
          setActiveMsg(notif);
        }
      });
    }
    // transport === "none": no listeners, no EventSource (preview/edit mode)

    return () => {
      disposed = true;
      es?.close();
      unsubNotification?.();
    };
  }, [telemetryMode, explicitTransport, props]);

  // Handle message expiration
  useEffect(() => {
    if (!activeMsg || !activeMsg.expiresAt) return;

    const delay = activeMsg.expiresAt - Date.now();
    if (delay <= 0) {
      // Programamos la limpieza asíncronamente en el siguiente tick del event loop
      // para evitar advertencias de renderizado síncrono en useEffect.
      const timer = setTimeout(() => {
        setActiveMsg(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setActiveMsg(null);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeMsg]);

  // If in edit mode, show a discrete premium placeholder
  if (editMode) {
    return (
      <div
        data-testid="engineer-placeholder"
        className="w-full h-full border border-dashed border-white/20 bg-black/40 rounded-lg flex flex-col items-center justify-center p-3 font-mono text-center gap-1"
        style={{ minWidth: "180px", minHeight: "60px" }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-vantare-red-400 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-vantare-red-500 animate-pulse" />
          Ingeniero
        </div>
        <div className="text-[9px] text-white/50">Widget de Notificaciones</div>
      </div>
    );
  }

  // In runtime mode, if there is no active message, render nothing (transparent)
  if (!activeMsg) {
    return null;
  }

  // Style border and badge based on severity
  const severityColors = {
    critical: {
      border: "border-red-500/30 bg-red-950/20",
      text: "text-red-400",
      badge: "bg-red-500/10 text-red-400 border border-red-500/20",
    },
    warning: {
      border: "border-yellow-500/30 bg-yellow-950/20",
      text: "text-yellow-400",
      badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    },
    info: {
      border: "border-white/10 bg-black/40",
      text: "text-white",
      badge: "bg-white/5 text-vantare-textMuted border border-white/5",
    },
  };

  const style = severityColors[activeMsg.severity as keyof typeof severityColors] || severityColors.info;

  return (
    <div
      data-testid="engineer-notification-box"
      className={`w-full h-full glass-panel rounded-xl border p-3.5 flex items-start gap-3 shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${style.border}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vantare-red-950/40 border border-vantare-red-500/20 flex items-center justify-center text-vantare-red-400 shadow-inner">
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 9h8m-8 4h6m2 5a2 2 0 11-4 0h-5V7a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${style.text}`}>
            Ingeniero
          </span>
          <span className="font-mono text-[8px] text-white/30 uppercase">
            {activeMsg.category}
          </span>
        </div>
        <span className={`text-xs font-bold leading-relaxed break-words ${style.text}`}>
          {activeMsg.text}
        </span>
      </div>
    </div>
  );
}
