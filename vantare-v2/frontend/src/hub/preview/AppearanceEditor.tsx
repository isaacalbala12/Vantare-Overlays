import type { WidgetAppearance } from "../../lib/profile";
import { resolveWidgetAppearance } from "../../overlay/widgets/widget-appearance";

const COLOR_FIELDS: Record<string, { key: keyof Omit<WidgetAppearance, "opacity">; label: string }[]> = {
  _common: [
    { key: "accentColor", label: "Accent" },
    { key: "textColor", label: "Texto" },
    { key: "backgroundColor", label: "Fondo" },
    { key: "borderColor", label: "Borde" },
  ],
  telemetry: [
    { key: "rpmGreen", label: "RPM Verde" },
    { key: "rpmYellow", label: "RPM Amarillo" },
    { key: "rpmRed", label: "RPM Rojo" },
    { key: "rpmBlue", label: "RPM Azul" },
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
  ],
  "telemetry-vertical": [
    { key: "rpmGreen", label: "RPM Verde" },
    { key: "rpmYellow", label: "RPM Amarillo" },
    { key: "rpmRed", label: "RPM Rojo" },
    { key: "rpmBlue", label: "RPM Azul" },
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
    { key: "pedalClutchColor", label: "Clutch" },
  ],
  standings: [
    { key: "posLeaderColor", label: "Líder" },
    { key: "pitColor", label: "Pit" },
    { key: "tireSoftColor", label: "Neum. Blando" },
    { key: "tireMediumColor", label: "Neum. Medio" },
    { key: "tireHardColor", label: "Neum. Duro" },
  ],
  relative: [
    { key: "gapAheadColor", label: "Gap Delante" },
    { key: "gapBehindColor", label: "Gap Detrás" },
  ],
  delta: [
    { key: "positiveColor", label: "Positivo" },
    { key: "negativeColor", label: "Negativo" },
  ],
  pedals: [
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
    { key: "pedalClutchColor", label: "Clutch" },
  ],
};

type AppearanceEditorProps = {
  widgetType: string;
  appearance: WidgetAppearance;
  disabled?: boolean;
  onChange: (appearance: WidgetAppearance) => void;
};

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block text-xs text-vantare-textMuted">
      {label}
      <input
        id={id}
        type="color"
        value={value ?? "#FFFFFF"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full bg-black/40 border border-white/10 rounded disabled:opacity-40"
      />
    </label>
  );
}

export function AppearanceEditor({ widgetType, appearance, disabled = false, onChange }: AppearanceEditorProps) {
  const common = COLOR_FIELDS._common;
  const specific = COLOR_FIELDS[widgetType] ?? [];

  const { appearance: effective } = resolveWidgetAppearance(widgetType, { appearance });

  function update(key: keyof Omit<WidgetAppearance, "opacity">, value: string) {
    onChange({ ...appearance, [key]: value });
  }

  return (
    <div className={`space-y-3 ${disabled ? "opacity-40" : ""}`}>
      <div className="grid grid-cols-2 gap-3">
        {common.map((field) => (
          <ColorField
            key={field.key}
            id={`color-${String(field.key)}`}
            label={field.label}
            value={effective[field.key] as string | undefined}
            disabled={disabled}
            onChange={(value) => update(field.key, value)}
          />
        ))}
      </div>
      {specific.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-vantare-textDim mb-2 block">Widget</span>
          <div className="grid grid-cols-2 gap-3">
            {specific.map((field) => (
              <ColorField
                key={field.key}
                id={`color-${String(field.key)}`}
                label={field.label}
                value={effective[field.key] as string | undefined}
                disabled={disabled}
                onChange={(value) => update(field.key, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
