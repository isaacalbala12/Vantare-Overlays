import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { DeltaWidget } from "../../overlay/widgets/DeltaWidget";
import { RelativeWidget } from "../../overlay/widgets/RelativeWidget";
import { StandingsWidget } from "../../overlay/widgets/StandingsWidget";
import { TelemetryWidget } from "../../overlay/widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "../../overlay/widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "../../overlay/widgets/PedalsWidget";
import type { ComponentType } from "react";

type WidgetProps = {
  editMode: boolean;
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
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (event: React.MouseEvent, widgetId: string) => void;
  disabled?: boolean;
};

export function PreviewWidgetFrame({ widget, scale, selected, onSelect, onDragStart, disabled = false }: PreviewWidgetFrameProps) {
  const style = getWidgetStyle(widget);
  const Component = WIDGETS[widget.type];

  return (
    <div
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
        left: widget.position.x * scale,
        top: widget.position.y * scale,
        width: widget.position.w * scale,
        height: widget.position.h * scale,
      }}
    >
      {Component ? (
        <div
          className={`w-full h-full overflow-hidden ${widget.enabled ? "" : "opacity-45 grayscale"}`}
          style={{ pointerEvents: "none" }}
        >
          <Component editMode={true} updateHz={widget.updateHz} props={{ ...widget.props, style }} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
          {widget.type}
        </div>
      )}
      {!widget.enabled && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}
    </div>
  );
}
