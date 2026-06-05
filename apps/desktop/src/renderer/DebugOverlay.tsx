import { useEffect, useRef, useState } from 'react';
import { useTelemetryStore } from '@vantare/ui-core';

// ── Types ──────────────────────────────────────────────────────────

interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────

const STORAGE_KEY = 'vantare:debug_overlay_visible';

// ── Helpers ────────────────────────────────────────────────────────

function getInitialVisible(): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // sessionStorage unavailable
  }

  return new URLSearchParams(window.location.search).has('debug');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ──────────────────────────────────────────────────────

export function DebugOverlay() {
  const [visible, setVisible] = useState(getInitialVisible);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [memory, setMemory] = useState('N/A');

  const timesRef = useRef<number[]>([]);
  const rafRef = useRef(0);
  const renderCountRef = useRef(0);

  // Increment every render (no loop — no setState involved)
  renderCountRef.current += 1;

  const telemetry = useTelemetryStore((s) => s.telemetry);

  // ── FPS via requestAnimationFrame ──────────────────────────────

  useEffect(() => {
    if (!visible) return;

    const tick = (now: number) => {
      const times = timesRef.current;
      times.push(now);

      // Keep a rolling window of the last 60 frames
      while (times.length > MAX_FRAMES) {
        times.shift();
      }

      if (times.length >= 2) {
        const elapsed = times[times.length - 1] - times[0];
        const avgFps = ((times.length - 1) / elapsed) * 1000;
        setFps(Math.round(avgFps));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  // ── Pipeline latency ───────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      setLatency(null);
      return;
    }
    if (!telemetry) {
      setLatency(null);
      return;
    }
    const now = Date.now();
    setLatency(now - telemetry.timestamp);
  }, [telemetry, visible]);

  // ── Memory usage (polled every 2 s) ────────────────────────────

  useEffect(() => {
    if (!visible) return;

    const update = () => {
      const perf = performance as ExtendedPerformance;
      if (perf.memory) {
        setMemory(formatBytes(perf.memory.usedJSHeapSize));
      }
    };

    update();
    const id = setInterval(update, 2_000);
    return () => clearInterval(id);
  }, [visible]);

  // ── Keyboard shortcut: Ctrl + Shift + D ────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible((prev) => {
          const next = !prev;
          try {
            sessionStorage.setItem(STORAGE_KEY, String(next));
          } catch {
            /* noop */
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  if (process.env.NODE_ENV === 'production') return null;
  if (!visible) return null;

  const fpsColor =
    fps < 30 ? 'text-red-400' : fps < 55 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="fixed top-2 left-2 z-50 min-w-[180px] rounded-lg border border-white/10 bg-black/70 backdrop-blur-md p-2.5 font-mono text-xs leading-relaxed text-white/80 shadow-lg select-none">
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="font-semibold tracking-wide text-white/90">DEBUG</span>
        <span className="text-[10px] text-white/35">Ctrl+Shift+D</span>
      </div>

      {/* Metrics */}
      <div className="space-y-0.5">
        <MetricRow label="FPS" value={String(fps)} valueClass={fpsColor} />
        <MetricRow
          label="Latency"
          value={latency !== null ? `${latency}ms` : '—'}
          valueClass={latency !== null && latency > 100 ? 'text-yellow-400' : undefined}
        />
        <MetricRow label="Memory" value={memory} />
        <MetricRow label="Re-renders" value={String(renderCountRef.current)} />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

const MAX_FRAMES = 60;

interface MetricRowProps {
  label: string;
  value: string;
  valueClass?: string;
}

function MetricRow({ label, value, valueClass }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/50">{label}</span>
      <span className={valueClass ?? 'text-white/80'}>{value}</span>
    </div>
  );
}
