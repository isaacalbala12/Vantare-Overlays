import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { updateWidgetAppearance } from "../preview/profile-editor";
import { StudioSectionHeader, StudioSettingRow } from "./studio-controls";
import { readPedalsSettings } from "./pedals-settings";

type PedalsSettingsSectionProps = {
  profile: ProfileConfig;
  widget: WidgetConfig;
  onChangeProfile: (profile: ProfileConfig) => void;
};

const CUSTOM_BG_FALLBACK = "#1a0104";

function ColorPickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StudioSettingRow label={label} htmlFor={id}>
      <input
        id={id}
        aria-label={label}
        type="color"
        className="h-7 w-full rounded-md border border-white/10 bg-black/40 px-1 py-0.5 focus:border-vantare-borderHover focus:outline-none cursor-pointer"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </StudioSettingRow>
  );
}

export function PedalsSettingsSection({ profile, widget, onChangeProfile }: PedalsSettingsSectionProps) {
  if (widget.type !== "pedals") return null;

  const settings = readPedalsSettings(widget);
  const isTransparent = settings.backgroundColor === "transparent";
  const customBgValue = isTransparent ? CUSTOM_BG_FALLBACK : settings.backgroundColor;

  function updateOne(key: "pedalThrottleColor" | "pedalBrakeColor" | "pedalClutchColor" | "backgroundColor", value: string) {
    onChangeProfile(updateWidgetAppearance(profile, widget.id, { [key]: value }));
  }

  function toggleTransparent() {
    onChangeProfile(
      updateWidgetAppearance(profile, widget.id, {
        backgroundColor: isTransparent ? customBgValue : "transparent",
      }),
    );
  }

  return (
    <section className="border-t border-white/5 bg-vantare-panel/60 px-4 py-3">
      <StudioSectionHeader
        title="Pedales"
        hint="Colores de barras y fondo del contenedor"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ColorPickerField
          id="pedals-throttle-color"
          label="Acelerador (throttle)"
          value={settings.pedalThrottleColor}
          onChange={(value) => updateOne("pedalThrottleColor", value)}
        />
        <ColorPickerField
          id="pedals-brake-color"
          label="Freno (brake)"
          value={settings.pedalBrakeColor}
          onChange={(value) => updateOne("pedalBrakeColor", value)}
        />
        <ColorPickerField
          id="pedals-clutch-color"
          label="Embrague (clutch)"
          value={settings.pedalClutchColor}
          onChange={(value) => updateOne("pedalClutchColor", value)}
        />
      </div>

      <div className="mt-3 border-t border-white/5 pt-3">
        <button
          type="button"
          role="switch"
          aria-checked={isTransparent}
          aria-label="Fondo transparente"
          onClick={toggleTransparent}
          className="flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-md border border-white/5 bg-black/30 px-2.5 py-1.5 text-left text-white transition-colors hover:border-white/15 hover:bg-black/40"
        >
          <span className="min-w-0">
            <span className="block truncate font-mono text-[11px] font-bold uppercase tracking-wide">
              Fondo transparente
            </span>
            <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-vantare-textDim">
              {isTransparent ? "Sin fondo (recomendado)" : "Fondo personalizado activo"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${
              isTransparent ? "border-vantare-red-500 bg-vantare-red-600" : "border-white/15 bg-black/50"
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                isTransparent ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        {!isTransparent && (
          <div className="mt-2">
            <ColorPickerField
              id="pedals-bg-color"
              label="Color de fondo del contenedor"
              value={settings.backgroundColor}
              onChange={(value) => updateOne("backgroundColor", value)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
