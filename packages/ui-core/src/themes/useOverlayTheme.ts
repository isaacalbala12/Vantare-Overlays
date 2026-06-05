import { useCallback, useContext, useMemo } from 'react';
import { ThemeContext } from './ThemeProvider';
import { mergeThemeTokens } from './theme-utils';
import type { ThemeTokenMap, ThemeTokens } from './types';

export function useOverlayTheme(overlayId: string) {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useOverlayTheme must be used within a ThemeProvider');
  }

  const {
    theme,
    tokens: globalTokens,
    runtimeOverlayOverrides,
    applyOverlayOverride,
    clearOverlayOverride,
  } = context;

  const tokens = useMemo(() => {
    let merged = globalTokens;
    const persistedOverride = theme.overlayOverrides?.[overlayId];
    const runtimeOverride = runtimeOverlayOverrides[overlayId];

    if (persistedOverride) {
      merged = mergeThemeTokens(merged, persistedOverride as Partial<ThemeTokens>);
    }
    if (runtimeOverride) {
      merged = mergeThemeTokens(merged, runtimeOverride);
    }

    return merged;
  }, [globalTokens, overlayId, runtimeOverlayOverrides, theme.overlayOverrides]);

  const applyOverride = useCallback(
    (override: Partial<ThemeTokenMap>) => {
      applyOverlayOverride(overlayId, override);
    },
    [applyOverlayOverride, overlayId],
  );

  const clearOverride = useCallback(() => {
    clearOverlayOverride(overlayId);
  }, [clearOverlayOverride, overlayId]);

  return {
    tokens,
    applyOverride,
    clearOverride,
  };
}
