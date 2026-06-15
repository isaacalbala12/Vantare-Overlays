export function clampWidgetHz(hz: number): number {
  const MAX_WIDGET_HZ = 30;
  const MIN_WIDGET_HZ = 1;
  if (!Number.isFinite(hz)) return MIN_WIDGET_HZ;
  return Math.max(MIN_WIDGET_HZ, Math.min(MAX_WIDGET_HZ, Math.round(hz)));
}

export function frameIntervalMs(hz: number): number {
  return 1000 / clampWidgetHz(hz);
}

/**
 * Start a paint loop running at the requested hz.
 * Uses requestAnimationFrame and skips frames when the tab is hidden
 * to avoid burning CPU on invisible overlays.
 */
export function startFrameBudgetLoop(
  hz: number,
  paint: (now: number) => void,
): () => void {
  const interval = frameIntervalMs(hz);
  let last = 0;
  let raf = 0;

  const tick = (now: number) => {
    if (document.hidden) {
      raf = requestAnimationFrame(tick);
      return;
    }
    if (now - last >= interval) {
      last = now;
      paint(now);
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
