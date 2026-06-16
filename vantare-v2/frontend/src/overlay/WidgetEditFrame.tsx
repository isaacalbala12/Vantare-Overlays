import { useRef, useState } from "react";
import type { Rect, WidgetConfig } from "../lib/profile";
import { getWidgetStyle } from "../lib/profile";
import { WIDGET_COMPONENTS } from "./shared-widget-map";

const MIN_SIZE = { w: 80, h: 40 };

type WidgetEditFrameProps = {
  widget: WidgetConfig;
  onChange: (widgetId: string, rect: Rect) => void;
};

export function WidgetEditFrame({ widget, onChange }: WidgetEditFrameProps) {
  const Component = WIDGET_COMPONENTS[widget.type];
  const [previewRect, setPreviewRect] = useState<Rect | null>(null);
  const visualRect = previewRect ?? widget.position;
  const committedRef = useRef(onChange);
  committedRef.current = onChange;

  function handleDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.testid?.startsWith("resize-handle-")) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };
    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      lastRect = {
        x: Math.max(0, Math.round(startRect.x + dx)),
        y: Math.max(0, Math.round(startRect.y + dy)),
        w: startRect.w,
        h: startRect.h,
      };
      setPreviewRect(lastRect);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setPreviewRect(null);
      committedRef.current(widget.id, lastRect);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleResizeStart(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };
    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dw = ev.clientX - startMouseX;
      const dh = ev.clientY - startMouseY;
      lastRect = {
        ...startRect,
        w: Math.max(MIN_SIZE.w, Math.round(startRect.w + dw)),
        h: Math.max(MIN_SIZE.h, Math.round(startRect.h + dh)),
      };
      setPreviewRect(lastRect);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setPreviewRect(null);
      committedRef.current(widget.id, lastRect);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  const style = getWidgetStyle(widget);

  return (
    <div
      data-testid={`edit-frame-${widget.id}`}
      onMouseDown={handleDragStart}
      className="absolute border border-vantare-red-400/70 hover:border-vantare-red-400 cursor-move"
      style={{
        left: visualRect.x,
        top: visualRect.y,
        width: visualRect.w,
        height: visualRect.h,
      }}
    >
      {Component && (
        <div className="w-full h-full overflow-hidden" style={{ pointerEvents: "none" }}>
          <Component
            editMode={true}
            telemetryMode="mock"
            updateHz={widget.updateHz}
            props={{ ...widget.props, style }}
          />
        </div>
      )}
      <div
        data-testid={`resize-handle-${widget.id}`}
        className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-vantare-red-500 cursor-se-resize"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
