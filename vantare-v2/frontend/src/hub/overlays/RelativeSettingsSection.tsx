import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { findWidgetVariant, toggleRelativeColumn, withDefaultWidgetVariants } from "../../lib/widget-variants";

type RelativeSettingsSectionProps = {
  profile: ProfileConfig;
  widget: WidgetConfig;
  onChangeProfile: (profile: ProfileConfig) => void;
};

export function RelativeSettingsSection({ profile, widget, onChangeProfile }: RelativeSettingsSectionProps) {
  if (widget.type !== "relative") return null;

  const normalized = withDefaultWidgetVariants(profile);
  const variant = findWidgetVariant(normalized, widget);
  const columns = variant?.columns ?? [];
  const bestLapEnabled = columns.find((column) => column.id === "bestLap")?.enabled ?? false;
  const lastLapEnabled = columns.find((column) => column.id === "lastLap")?.enabled ?? false;
  const updateColumn = (columnId: "bestLap" | "lastLap", enabled: boolean) => {
    onChangeProfile(toggleRelativeColumn(normalized, widget.id, columnId, enabled));
  };

  return (
    <section className="border-t border-white/5 bg-vantare-panel px-5 py-4">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-vantare-text">COLUMNAS RELATIVE</h3>
      <div className="space-y-3">
        <button
          type="button"
          role="switch"
          aria-checked={bestLapEnabled}
          aria-label="Mostrar mejor vuelta"
          onClick={() => updateColumn("bestLap", !bestLapEnabled)}
          className="flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-left text-sm text-white transition-colors hover:border-white/15 hover:bg-black/30"
        >
          <span>
            <span className="block text-xs font-medium">Mostrar mejor vuelta</span>
            <span className="block text-[10px] text-vantare-textMuted">Añade `bestLap` como columna opcional.</span>
          </span>
          <span
            aria-hidden="true"
            className={`h-5 w-9 rounded-full border p-0.5 transition-colors ${
              bestLapEnabled ? "border-vantare-red-500 bg-vantare-red-600" : "border-white/15 bg-black/40"
            }`}
          >
            <span
              className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                bestLapEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={lastLapEnabled}
          aria-label="Mostrar última vuelta"
          onClick={() => updateColumn("lastLap", !lastLapEnabled)}
          className="flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-left text-sm text-white transition-colors hover:border-white/15 hover:bg-black/30"
        >
          <span>
            <span className="block text-xs font-medium">Mostrar última vuelta</span>
            <span className="block text-[10px] text-vantare-textMuted">Añade `lastLap` como columna opcional.</span>
          </span>
          <span
            aria-hidden="true"
            className={`h-5 w-9 rounded-full border p-0.5 transition-colors ${
              lastLapEnabled ? "border-vantare-red-500 bg-vantare-red-600" : "border-white/15 bg-black/40"
            }`}
          >
            <span
              className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                lastLapEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>
    </section>
  );
}
