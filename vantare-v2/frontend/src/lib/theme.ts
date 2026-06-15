export type ThemeId = "vantare-v5" | "vantare-lite";

export type ThemeColors = {
  bg: string;
  surface: string;
  panel: string;
  border: string;
  borderHover: string;
  text: string;
  textMuted: string;
  textDim: string;
  red400: string;
  red500: string;
  red600: string;
  red700: string;
  red900: string;
  red950: string;
  wine: string;
  burgundy: string;
  blood: string;
  success: string;
  warning: string;
};

export type ThemeEffects = {
  glassAlpha: string;
  glassBlur: string;
  cardShadow: string;
  hoverTranslateY: string;
  motionScale: string;
};

export type ThemeFonts = {
  sans: string;
  display: string;
  mono: string;
};

export type VantareTheme = {
  id: string;
  name: string;
  mode: "full" | "lite";
  colors: ThemeColors;
  effects: ThemeEffects;
  fonts: ThemeFonts;
};

export const DEFAULT_THEME_ID: ThemeId = "vantare-v5";
const THEME_STORAGE_KEY = "vantare.theme";

export function normalizeThemeId(value: string | null): ThemeId {
  return value === "vantare-lite" ? "vantare-lite" : DEFAULT_THEME_ID;
}

export function cssVarsFromTheme(theme: VantareTheme): Record<string, string> {
  return {
    "--v-bg": theme.colors.bg,
    "--v-surface": theme.colors.surface,
    "--v-panel": theme.colors.panel,
    "--v-border": theme.colors.border,
    "--v-border-hover": theme.colors.borderHover,
    "--v-text": theme.colors.text,
    "--v-text-muted": theme.colors.textMuted,
    "--v-text-dim": theme.colors.textDim,
    "--v-red-400": theme.colors.red400,
    "--v-red-500": theme.colors.red500,
    "--v-red-600": theme.colors.red600,
    "--v-red-700": theme.colors.red700,
    "--v-red-900": theme.colors.red900,
    "--v-red-950": theme.colors.red950,
    "--v-wine": theme.colors.wine,
    "--v-burgundy": theme.colors.burgundy,
    "--v-blood": theme.colors.blood,
    "--v-success": theme.colors.success,
    "--v-warning": theme.colors.warning,
    "--v-glass-alpha": theme.effects.glassAlpha,
    "--v-glass-blur": theme.effects.glassBlur,
    "--v-card-shadow": theme.effects.cardShadow,
    "--v-hover-translate-y": theme.effects.hoverTranslateY,
    "--v-motion-scale": theme.effects.motionScale,
    "--v-font-sans": theme.fonts.sans,
    "--v-font-display": theme.fonts.display,
    "--v-font-mono": theme.fonts.mono,
  };
}

export function applyThemeToElement(el: HTMLElement, theme: VantareTheme) {
  el.dataset.theme = theme.id;
  el.dataset.visualMode = theme.mode;
  for (const [key, value] of Object.entries(cssVarsFromTheme(theme))) {
    el.style.setProperty(key, value);
  }
}

export function applyTheme(theme: VantareTheme) {
  applyThemeToElement(document.documentElement, theme);
}

export function getStoredThemeId(storage: Storage = window.localStorage): ThemeId {
  try {
    return normalizeThemeId(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function persistThemeId(
  themeId: ThemeId,
  storage: Storage = window.localStorage,
) {
  try {
    storage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Storage can be unavailable in restricted embedded browser contexts.
  }
}
