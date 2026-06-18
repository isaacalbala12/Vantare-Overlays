import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";

type WidgetPreviewPanelProps = {
  widget: WidgetConfig | null;
};

export function WidgetPreviewPanel({ widget }: WidgetPreviewPanelProps) {
  if (!widget) {
    return (
      <section className="card-sleek flex min-h-[420px] items-center justify-center rounded-xl p-6">
        <p className="text-sm text-vantare-textMuted">Selecciona un widget</p>
      </section>
    );
  }

  return (
    <section className="card-sleek flex min-h-[420px] flex-col rounded-xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">{widget.id}</h2>
          <p className="mt-1 font-mono text-xs text-vantare-textMuted">Tipo: {widget.type}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
          widget.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-vantare-textDim"
        }`}>
          {widget.enabled ? "Activo" : "Oculto"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-black/40 p-8">
        <div className="w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-6 text-center shadow-2xl">
          <p className="font-display text-2xl font-bold text-white">{widget.name || widget.id}</p>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Preview compacto de configuración. La colocación se editará en Perfiles específicos.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Hz</p>
              <p className="font-display text-lg font-bold text-white">{widget.updateHz ?? 30} Hz</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Style</p>
              <p className="truncate font-mono text-xs text-white">{getWidgetStyle(widget)}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Tamaño</p>
              <p className="font-mono text-xs text-white">{widget.position.w}×{widget.position.h}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
