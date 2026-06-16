import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { WIDGET_COMPONENTS } from "../../overlay/shared-widget-map";

type WidgetPreviewProps = {
  widget: WidgetConfig;
  scale?: number;
};

export function WidgetPreview({ widget, scale = 0.5 }: WidgetPreviewProps) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div className="flex items-center justify-center w-full h-full text-white/30 text-xs font-mono">
        {widget.type}
      </div>
    );
  }
  const style = getWidgetStyle(widget);
  return (
    <div
      className="relative overflow-hidden bg-transparent"
      style={{
        width: widget.position.w * scale,
        height: widget.position.h * scale,
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: widget.position.w,
          height: widget.position.h,
          transform: `scale(${scale})`,
        }}
      >
        <Component
          editMode={true}
          telemetryMode="mock"
          updateHz={widget.updateHz}
          props={{ ...widget.props, style }}
        />
      </div>
    </div>
  );
}
