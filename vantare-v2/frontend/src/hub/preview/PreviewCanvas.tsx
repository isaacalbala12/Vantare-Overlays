import { useEffect, useRef, useState, useCallback } from "react";
import { clampPosition, clampSize, resizeWithRatio, snap, WIDGET_MIN_SIZE } from "../../lib/canvas-math";
import type { ProfileConfig, Rect } from "../../lib/profile";
import { updateWidgetPosition } from "./profile-editor";
import { PreviewWidgetFrame } from "./PreviewWidgetFrame";

type PreviewCanvasProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
  disabled?: boolean;
};

const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;
const MAX_CANVAS_WIDTH = 960;

export function PreviewCanvas({ profile, selectedWidgetId, onSelectWidget, onChangeProfile, disabled = false }: PreviewCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId);
  const scale = canvasWidth / LOGICAL_WIDTH;

  // Local preview positions for smooth drag/resize without re-rendering the whole profile.
  const [previewRects, setPreviewRects] = useState<Record<string, Rect> | null>(null);
  const previewRectsRef = useRef(previewRects);
  previewRectsRef.current = previewRects;

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const dragRef = useRef<{
    mode: "drag" | "resize";
    widgetId: string;
    startMouseX: number;
    startMouseY: number;
    startRect: Rect;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const updateWidth = () => {
      const measuredWidth = node.clientWidth || MAX_CANVAS_WIDTH;
      const width = Math.min(MAX_CANVAS_WIDTH, Math.max(280, measuredWidth));
      setCanvasWidth(width);
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  const setLocalRect = useCallback((widgetId: string, rect: Rect) => {
    setPreviewRects((prev) => {
      const base = prev ?? Object.fromEntries(profileRef.current.widgets.map((w) => [w.id, w.position]));
      return { ...base, [widgetId]: rect };
    });
  }, []);

  const commitRect = useCallback((widgetId: string, rect: Rect) => {
    setPreviewRects(null);
    onChangeProfile(updateWidgetPosition(profileRef.current, widgetId, rect));
  }, [onChangeProfile]);

  function onMouseDown(event: React.MouseEvent, widgetId: string) {
    if (disabled) return;
    if ((event.target as HTMLElement).dataset.testid?.startsWith("resize-handle-")) return;
    event.preventDefault();
    const widget = profile.widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    onSelectWidget(widgetId);
    const point = toCanvasPoint(event.clientX, event.clientY);
    dragRef.current = {
      mode: "drag",
      widgetId,
      startMouseX: point.x,
      startMouseY: point.y,
      startRect: { ...widget.position },
      moved: false,
    };
    attachMouseListeners();
  }

  function onResizeStart(event: React.MouseEvent, widgetId: string, startRect: Rect) {
    if (disabled) return;
    event.preventDefault();
    onSelectWidget(widgetId);
    dragRef.current = {
      mode: "resize",
      widgetId,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startRect,
      moved: false,
    };
    attachMouseListeners();
  }

  function attachMouseListeners() {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  function detachMouseListeners() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  const onMouseMove = useCallback((event: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "drag") {
      const point = toCanvasPoint(event.clientX, event.clientY);
      const dxRaw = (point.x - drag.startMouseX) / scale;
      const dyRaw = (point.y - drag.startMouseY) / scale;
      if (Math.abs(dxRaw) < 1 && Math.abs(dyRaw) < 1 && !drag.moved) {
        return;
      }

      const rawX = Math.round(drag.startRect.x + dxRaw);
      const rawY = Math.round(drag.startRect.y + dyRaw);
      const snappedX = snap(rawX);
      const snappedY = snap(rawY);
      const { x, y } = clampPosition(snappedX, snappedY, drag.startRect.w, drag.startRect.h);
      const nextPos = { ...drag.startRect, x, y };

      setLocalRect(drag.widgetId, nextPos);
      drag.moved = true;
      return;
    }

    // resize mode
    const deltaX = (event.clientX - drag.startMouseX) / scale;
    const deltaY = (event.clientY - drag.startMouseY) / scale;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && !drag.moved) {
      return;
    }

    const widget = profileRef.current.widgets.find((w) => w.id === drag.widgetId);
    const type = widget?.type ?? "standings";
    const { w, h } = resizeWithRatio(type, drag.startRect.w, drag.startRect.h, deltaX, deltaY);
    const clamped = clampSize(w, h, drag.startRect.x, drag.startRect.y);
    const snapped = { ...clamped, w: snap(clamped.w), h: snap(clamped.h) };
    const bounded = {
      ...snapped,
      w: Math.max(snapped.w, WIDGET_MIN_SIZE.w),
      h: Math.max(snapped.h, WIDGET_MIN_SIZE.h),
    };

    setLocalRect(drag.widgetId, bounded);
    drag.moved = true;
  }, [scale, setLocalRect]);

  const onMouseUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    detachMouseListeners();
    if (!drag) return;

    const rect = previewRectsRef.current?.[drag.widgetId] ?? drag.startRect;
    commitRect(drag.widgetId, rect);
  }, [commitRect]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled || !selectedWidget) return;
    const step = event.shiftKey ? 8 : 1;
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case "ArrowLeft":
        dx = -step;
        break;
      case "ArrowRight":
        dx = step;
        break;
      case "ArrowUp":
        dy = -step;
        break;
      case "ArrowDown":
        dy = step;
        break;
      default:
        return;
    }
    event.preventDefault();
    const { x, y } = clampPosition(
      selectedWidget.position.x + dx,
      selectedWidget.position.y + dy,
      selectedWidget.position.w,
      selectedWidget.position.h,
    );
    onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, { ...selectedWidget.position, x, y }));
  }

  const currentRects = previewRects ?? Object.fromEntries(profile.widgets.map((w) => [w.id, w.position]));

  return (
    <div ref={shellRef} className="glass-panel rounded-xl p-4 overflow-hidden">
      <div className="mb-3 flex items-center justify-between text-xs font-mono text-vantare-textMuted">
        <span>{profile.name || profile.id || "Perfil activo"}</span>
        <span>1920×1080</span>
      </div>
      <div
        ref={canvasRef}
        data-testid="preview-viewport"
        className="relative mx-auto bg-black/40 border border-white/10 overflow-hidden outline-none"
        style={{ width: canvasWidth, height: LOGICAL_HEIGHT * scale }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <div
          data-testid="preview-scene"
          className="absolute left-0 top-0"
          style={{
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {profile.widgets.map((widget) => (
            <PreviewWidgetFrame
              key={widget.id}
              widget={widget}
              selected={widget.id === selectedWidgetId}
              onSelect={onSelectWidget}
              onDragStart={onMouseDown}
              onResizeStart={onResizeStart}
              previewPosition={currentRects[widget.id]}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
