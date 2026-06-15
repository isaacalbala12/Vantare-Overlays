import { getStylesForType } from "../state/style-catalog";

type StyleSelectorProps = {
  widgetType: string;
  currentStyle: string;
  disabled?: boolean;
  onStyleChange: (styleId: string) => void;
};

export function StyleSelector({ widgetType, currentStyle, disabled = false, onStyleChange }: StyleSelectorProps) {
  const styles = getStylesForType(widgetType);
  if (styles.length <= 1) {
    return (
      <div className="text-xs text-vantare-textMuted font-mono">
        Estilo: {styles[0]?.name ?? "Default"}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 ${disabled ? "opacity-40" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-vantare-textDim">Estilo</span>
      <div className="flex gap-2">
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onStyleChange(s.id)}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              currentStyle === s.id
                ? "bg-vantare-red-950/30 border border-vantare-red-500 text-white"
                : "bg-black/30 border border-white/10 text-vantare-textMuted hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
