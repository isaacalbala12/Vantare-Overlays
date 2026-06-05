import { useEffect, useRef, useState } from 'react';
import { useTelemetryStore } from '@vantare/ui-core';

export function PreviewOverlay() {
  const isDev = process.env.NODE_ENV !== 'production';

  // Store update rate (N/s): count how many times useTelemetryStore
  // subscribers fire per second, reset each interval tick.
  const [updateRate, setUpdateRate] = useState(0);
  const updateCountRef = useRef(0);

  // Frame time (ms): performance.now() delta between consecutive renders.
  // Captured in the render body without triggering state re-entrance,
  // then flushed to display state on the interval tick.
  const lastFrameRef = useRef(performance.now());
  const frameTimeRef = useRef(0);
  const [frameTime, setFrameTime] = useState(0);

  // Render count: incremented once per render in the component body.
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Capture frame-time delta on every render into a ref so the interval
  // tick can read the latest value without causing an effect loop.
  {
    const now = performance.now();
    const delta = now - lastFrameRef.current;
    // Clamp to a reasonable lower bound (0.1 ms) so initial renders
    // don't show 0.00 when both timestamps land in the same microtask.
    frameTimeRef.current = Math.max(0.1, Math.round(delta * 10) / 10);
    lastFrameRef.current = now;
  }

  // Subscribe to every store state change so we can count update frequency.
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe(() => {
      updateCountRef.current += 1;
    });
    return unsub;
  }, []);

  // Once per second, flush accumulated metrics into display state.
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateRate(updateCountRef.current);
      setFrameTime(frameTimeRef.current);
      updateCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isDev) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 min-w-[140px] rounded-lg border border-purple-500/30 bg-purple-900/40 p-3 font-mono text-xs text-purple-300 backdrop-blur-sm"
      data-testid="preview-overlay"
    >
      <div className="flex justify-between gap-3">
        <span>Updates</span>
        <span className="tabular-nums font-semibold text-purple-200">
          {updateRate}/s
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span>Frame</span>
        <span className="tabular-nums font-semibold text-purple-200">
          {frameTime}ms
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span>Renders</span>
        <span className="tabular-nums font-semibold text-purple-200">
          {renderCountRef.current}
        </span>
      </div>
    </div>
  );
}
