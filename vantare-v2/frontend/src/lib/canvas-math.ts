export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const SNAP_PX = 8;

export function snap(value: number, grid = SNAP_PX): number {
  return Math.round(value / grid) * grid;
}

export function clampPosition(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, CANVAS_WIDTH - w)),
    y: Math.max(0, Math.min(y, CANVAS_HEIGHT - h)),
  };
}

export const WIDGET_MIN_SIZE = { w: 80, h: 40 };

export const WIDGET_RATIOS: Record<string, number | null> = {
  standings: null,
  relative: 0.5,
  delta: 4,
  telemetry: 2,
  "telemetry-vertical": 0.5,
  pedals: 2,
};

export function resizeWithRatio(
  type: string,
  startW: number,
  startH: number,
  deltaX: number,
  deltaY: number,
): { w: number; h: number } {
  const ratio = WIDGET_RATIOS[type] ?? null;
  if (ratio == null) {
    return {
      w: Math.max(WIDGET_MIN_SIZE.w, startW + deltaX),
      h: Math.max(WIDGET_MIN_SIZE.h, startH + deltaY),
    };
  }
  const h = Math.max(WIDGET_MIN_SIZE.h, startH + deltaY);
  const w = Math.max(WIDGET_MIN_SIZE.w, Math.round(h * ratio));
  return { w, h };
}

export function clampSize(
  w: number,
  h: number,
  x: number,
  y: number,
): { w: number; h: number; x: number; y: number } {
  const maxW = CANVAS_WIDTH - x;
  const maxH = CANVAS_HEIGHT - y;
  return {
    w: Math.min(w, maxW),
    h: Math.min(h, maxH),
    x,
    y,
  };
}
