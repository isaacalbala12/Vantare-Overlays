import React from "react";
import type { Rect, WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { DeltaWidget } from "../../overlay/widgets/DeltaWidget";
import { RelativeWidget } from "../../overlay/widgets/RelativeWidget";
import { StandingsWidget } from "../../overlay/widgets/StandingsWidget";
import { TelemetryWidget } from "../../overlay/widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "../../overlay/widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "../../overlay/widgets/PedalsWidget";
import type { ComponentType } from "react";
import type { WidgetTelemetryMode } from "../../overlay/widgets/use-widget-telemetry";

type WidgetProps = {
  editMode: boolean;
  telemetryMode?: WidgetTelemetryMode;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
  telemetry: TelemetryWidget,
  "telemetry-vertical": TelemetryVerticalWidget,
  pedals: PedalsWidget,
};

type PreviewWidgetFrameProps = {
  widget: WidgetConfig;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (event: React.MouseEvent, widgetId: string) => void;
  onResizeStart?: (event: React.MouseEvent, widgetId: string, startRect: Rect) => void;
  disabled?: boolean;
  previewPosition?: Rect;
};

export const PreviewWidgetFrame = React.memo(function PreviewWidgetFrame({
  widget,
  selected,
  onSelect,
  onDragStart,
  onResizeStart,
  disabled = false,
  previewPosition,
}: PreviewWidgetFrameProps) {
  const style = getWidgetStyle(widget);
  const Component = WIDGETS[widget.type];

  const position = previewPosition ?? widget.position;

  function handleResizeMouseDown(e: React.MouseEvent) {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    onResizeStart?.(e, widget.id, widget.position);
  }

  return (
    <div
      data-testid={`preview-widget-frame-${widget.id}`}
      onMouseDown={(e) => {
        onSelect(widget.id);
        onDragStart?.(e, widget.id);
      }}
      className={`absolute text-left border transition-colors cursor-pointer ${
        selected ? "border-vantare-red-400" : "border-white/15 hover:border-white/30"
      } ${widget.enabled ? "" : "border-dashed"} ${
        disabled ? "pointer-events-none" : ""
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: position.w,
        height: position.h,
      }}
    >
      {Component ? (
        <div
          className={`w-full h-full overflow-hidden ${widget.enabled ? "" : "opacity-45 grayscale"}`}
          style={{ pointerEvents: "none" }}
        >
          <Component editMode={true} telemetryMode="mock" updateHz={widget.updateHz} props={{ ...widget.props, style }} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
          {widget.type}
        </div>
      )}
      {!widget.enabled && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}
      {selected && !disabled && (
        <div
          data-testid={`resize-handle-${widget.id}`}
          className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-vantare-red-400 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
});
