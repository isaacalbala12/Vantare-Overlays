import { useRef, useState } from "react";
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { getStylesForType } from "../state/style-catalog";

type WidgetListProps = {
  widgets: WidgetConfig[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  onAddWidget?: (type: string) => void;
};

const WIDGET_TYPES = ["delta", "relative", "standings", "telemetry", "telemetry-vertical", "pedals"];

export function WidgetList({ widgets, selectedWidgetId, onSelectWidget, onAddWidget }: WidgetListProps) {
  const [adding, setAdding] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  function handleAdd() {
    const type = selectRef.current?.value;
    if (!type) return;
    onAddWidget?.(type);
    setAdding(false);
  }

  return (
    <aside className="glass-panel rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Widgets</h2>
        <span className="font-mono text-[10px] text-vantare-textDim">{widgets.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {widgets.map((widget) => {
          const currentStyle = getWidgetStyle(widget);
          const styles = getStylesForType(widget.type);
          const styleName = styles.find((s) => s.id === currentStyle)?.name ?? currentStyle;
          return (
          <button
            key={widget.id}
            type="button"
            data-testid={`widget-list-${widget.id}`}
            onClick={() => onSelectWidget(widget.id)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              selectedWidgetId === widget.id
                ? "border-vantare-red-500 bg-vantare-red-950/30"
                : "border-white/10 bg-black/25 hover:border-white/20"
            } ${widget.enabled ? "text-white" : "text-vantare-textDim"}`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold">{widget.id}</span>
              <span className={`text-[10px] font-bold ${widget.enabled ? "text-emerald-400" : "text-vantare-textDim"}`}>
                {widget.enabled ? "Visible" : "Oculto"}
              </span>
            </span>
            <span className="mt-1 block font-mono text-[10px] text-vantare-textDim">
              {widget.type} · {styleName} · {widget.position.w}×{widget.position.h}
            </span>
          </button>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            ref={selectRef}
            defaultValue="delta"
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs"
          >
            {WIDGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-vantare-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-vantare-red-600"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-vantare-textMuted hover:text-white"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-white/10 py-2 text-xs text-vantare-textMuted hover:border-white/20 hover:text-white transition-colors"
        >
          + Anadir widget
        </button>
      )}
    </aside>
  );
}
