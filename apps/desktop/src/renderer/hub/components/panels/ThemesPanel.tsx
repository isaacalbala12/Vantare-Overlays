import { useThemePreview } from '../../hooks/useThemePreview';
import type { Theme } from '@vantare/types';

function ThemeColorCircles({ theme }: { theme: Theme }) {
  const colors = [
    theme.tokens.color.primary,
    theme.tokens.color.secondary,
    theme.tokens.color.positive,
    theme.tokens.color.surfaceElevated,
  ];

  return (
    <div className="flex gap-1.5">
      {colors.map((color, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border border-white/10"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-2">
      <ThemeColorCircles theme={theme} />
      <p className="text-xs text-[var(--color-text)] font-medium">{theme.name}</p>
      <p className="text-[10px] text-[var(--color-text-muted)]">{theme.description}</p>
    </div>
  );
}

export default function ThemesPanel() {
  const { activeTheme, loading } = useThemePreview();

  if (loading) {
    return <div className="dashboard-panel-skeleton h-16" />;
  }

  if (!activeTheme) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--color-text)]">Default</p>
        <p className="text-xs text-[var(--color-text-muted)]">No theme configured</p>
      </div>
    );
  }

  return <ThemePreview theme={activeTheme} />;
}
