import { useEffect, useRef, useState } from "react";
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { WIDGET_COMPONENTS } from "../../overlay/shared-widget-map";

type WidgetPreviewProps = {
  widget: WidgetConfig;
};

export function WidgetPreview({ widget }: WidgetPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div className="flex items-center justify-center w-full h-full text-white/30 text-xs font-mono">
        {widget.type}
      </div>
    );
  }

  const style = getWidgetStyle(widget);
  const widgetW = widget.position.w || 100;
  const widgetH = widget.position.h || 100;

  // Calculate scaling factor to fit within 90% of the container, capped at 1.0 (to preserve relative sizes)
  const paddingFactor = 0.9;
  const scaleX = (size.w * paddingFactor) / widgetW;
  const scaleY = (size.h * paddingFactor) / widgetH;
  const scale = Math.min(1.0, scaleX, scaleY);

  const previewW = widgetW * scale;
  const previewH = widgetH * scale;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] flex items-center justify-center relative overflow-hidden preview-grid-bg rounded-xl"
    >
      <div
        className="relative overflow-hidden bg-transparent border border-white/10 shadow-2xl transition-all"
        style={{
          width: previewW,
          height: previewH,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: widgetW,
            height: widgetH,
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
    </div>
  );
}
