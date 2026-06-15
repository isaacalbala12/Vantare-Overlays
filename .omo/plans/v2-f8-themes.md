# Runtime Themes and Lite Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Fase 8 by moving Vantare v5 visual tokens into runtime theme variables and adding Lite mode for lower visual/GPU cost.

**Architecture:** Keep `hub_main_v5.html` as the visual source of truth. Export its approved tokens to JSON, map them into CSS custom properties, and make existing hub/overlay styles consume those variables. Theme application stays frontend-only for this phase; persistence can remain profile/config JSON if already available, but no cloud/auth work is introduced.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, CSS custom properties, Vitest, Go/Wails v3.

---

## Contexto

Fase 8 no debe rediseñar Vantare. Debe hacer que los tokens v5 de diseño sean reutilizables y ajustables en runtime.

Estado actual:

- Tokens v5 están hardcodeados en `vantare-v2/frontend/src/index.css` dentro de `@theme` y clases CSS.
- `hub_main_v5.html` sigue siendo la fuente visual aprobada.
- Widgets overlay usan clases Tailwind y algunos colores fijos (`text-emerald-400`, `text-red-400`, `bg-white/10`, etc.).
- Fase 7 dejó widgets más eficientes; F8 no debe aumentar coste visual por defecto.

## Alcance

- [ ] In scope: crear `themes/vantare-v5.json`.
- [ ] In scope: crear `themes/vantare-lite.json`.
- [ ] In scope: helper TS para cargar/aplicar theme JSON a CSS variables.
- [ ] In scope: variables CSS `--v-*` usadas por clases compartidas.
- [ ] In scope: `data-theme` y `data-visual-mode` en `<html>` o `<body>`.
- [ ] In scope: Lite mode que reduce `backdrop-filter`, sombras y animaciones caras.
- [ ] In scope: toggle simple en Hub Setup o fallback en Topbar/Profiles si Setup sigue stub.
- [ ] In scope: tests unitarios de validación/aplicación de temas.
- [ ] In scope: docs y evidencia.
- [ ] Out of scope: auth, cloud sync, marketplace.
- [ ] Out of scope: editor visual avanzado de temas.
- [ ] Out of scope: importar temas externos arbitrarios desde disco.
- [ ] Out of scope: cambiar la dirección visual del Hub v5.

## Archivos Tocables

- Create: `vantare-v2/frontend/src/themes/vantare-v5.json`
- Create: `vantare-v2/frontend/src/themes/vantare-lite.json`
- Create: `vantare-v2/frontend/src/lib/theme.ts`
- Create: `vantare-v2/frontend/src/lib/theme.test.ts`
- Modify: `vantare-v2/frontend/src/index.css`
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx`
- Modify: `vantare-v2/frontend/src/hub/components/Topbar.tsx` or create/use Setup page if present.
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md` only at closeout.
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md` only at closeout.
- Modify: `docs/proyecto/06-DISENO-UI.md` to document theme files.
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` to add F8 manual checks.
- Create: `.omo/evidence/v2-f8-themes.txt` at closeout.

## Theme Schema

Use this initial shape:

```ts
export type VantareTheme = {
  id: string;
  name: string;
  mode: "full" | "lite";
  colors: {
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
  effects: {
    glassAlpha: string;
    glassBlur: string;
    cardShadow: string;
    hoverTranslateY: string;
    motionScale: string;
  };
  fonts: {
    sans: string;
    display: string;
    mono: string;
  };
};
```

## Task 1: Crear temas JSON canónicos

**Files:**
- Create: `vantare-v2/frontend/src/themes/vantare-v5.json`
- Create: `vantare-v2/frontend/src/themes/vantare-lite.json`

- [ ] Step 1: Crear `vantare-v5.json` con tokens actuales.

```json
{
  "id": "vantare-v5",
  "name": "Vantare v5",
  "mode": "full",
  "colors": {
    "bg": "#080808",
    "surface": "#0F0F0F",
    "panel": "#141414",
    "border": "#1E1E1E",
    "borderHover": "#2A2A2A",
    "text": "#E8E8E8",
    "textMuted": "#7A7A7A",
    "textDim": "#4A4A4A",
    "red400": "#E63946",
    "red500": "#C1121F",
    "red600": "#9B2226",
    "red700": "#800020",
    "red900": "#4A0012",
    "red950": "#2A000A",
    "wine": "#722F37",
    "burgundy": "#4A0E16",
    "blood": "#8B0000",
    "success": "#34D399",
    "warning": "#FFD700"
  },
  "effects": {
    "glassAlpha": "0.6",
    "glassBlur": "20px",
    "cardShadow": "0 4px 20px rgba(139, 0, 0, 0.1)",
    "hoverTranslateY": "-2px",
    "motionScale": "1"
  },
  "fonts": {
    "sans": "'Inter', sans-serif",
    "display": "'Rajdhani', sans-serif",
    "mono": "'Space Mono', monospace"
  }
}
```

- [ ] Step 2: Crear `vantare-lite.json` con mismos colores base y efectos reducidos.

```json
{
  "id": "vantare-lite",
  "name": "Vantare Lite",
  "mode": "lite",
  "colors": {
    "bg": "#080808",
    "surface": "#0F0F0F",
    "panel": "#141414",
    "border": "#2A2A2A",
    "borderHover": "#3A3A3A",
    "text": "#E8E8E8",
    "textMuted": "#8A8A8A",
    "textDim": "#5A5A5A",
    "red400": "#E63946",
    "red500": "#C1121F",
    "red600": "#9B2226",
    "red700": "#800020",
    "red900": "#4A0012",
    "red950": "#2A000A",
    "wine": "#722F37",
    "burgundy": "#4A0E16",
    "blood": "#8B0000",
    "success": "#34D399",
    "warning": "#FFD700"
  },
  "effects": {
    "glassAlpha": "0.9",
    "glassBlur": "0px",
    "cardShadow": "none",
    "hoverTranslateY": "0px",
    "motionScale": "0"
  },
  "fonts": {
    "sans": "system-ui, sans-serif",
    "display": "'Rajdhani', sans-serif",
    "mono": "'Space Mono', monospace"
  }
}
```

- [ ] Step 3: Ejecutar build para confirmar que JSON imports futuros serán compatibles.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
```

Expected: PASS.

## Task 2: Helper de tema con tests

**Files:**
- Create: `vantare-v2/frontend/src/lib/theme.ts`
- Create: `vantare-v2/frontend/src/lib/theme.test.ts`

- [ ] Step 1: Crear test RED.

```ts
import { describe, expect, it } from "vitest";
import { applyThemeToElement, cssVarsFromTheme, type VantareTheme } from "./theme";

const theme: VantareTheme = {
  id: "test",
  name: "Test",
  mode: "full",
  colors: {
    bg: "#000000",
    surface: "#111111",
    panel: "#222222",
    border: "#333333",
    borderHover: "#444444",
    text: "#eeeeee",
    textMuted: "#999999",
    textDim: "#666666",
    red400: "#E63946",
    red500: "#C1121F",
    red600: "#9B2226",
    red700: "#800020",
    red900: "#4A0012",
    red950: "#2A000A",
    wine: "#722F37",
    burgundy: "#4A0E16",
    blood: "#8B0000",
    success: "#34D399",
    warning: "#FFD700"
  },
  effects: {
    glassAlpha: "0.6",
    glassBlur: "20px",
    cardShadow: "none",
    hoverTranslateY: "-2px",
    motionScale: "1"
  },
  fonts: {
    sans: "Inter",
    display: "Rajdhani",
    mono: "Space Mono"
  }
};

describe("theme", () => {
  it("maps theme to CSS variables", () => {
    expect(cssVarsFromTheme(theme)["--v-bg"]).toBe("#000000");
    expect(cssVarsFromTheme(theme)["--v-glass-blur"]).toBe("20px");
  });

  it("applies variables and data attributes", () => {
    const el = document.createElement("div");
    applyThemeToElement(el, theme);
    expect(el.dataset.theme).toBe("test");
    expect(el.dataset.visualMode).toBe("full");
    expect(el.style.getPropertyValue("--v-bg")).toBe("#000000");
  });
});
```

- [ ] Step 2: Ejecutar test y confirmar RED.

```powershell
pnpm --dir frontend test -- theme
```

Expected: FAIL porque `theme.ts` no existe.

- [ ] Step 3: Implementar helper.

```ts
export type VantareTheme = {
  id: string;
  name: string;
  mode: "full" | "lite";
  colors: Record<string, string>;
  effects: Record<string, string>;
  fonts: Record<string, string>;
};

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
```

- [ ] Step 4: Reejecutar test.

```powershell
pnpm --dir frontend test -- theme
```

Expected: PASS.

## Task 3: Convertir CSS base a variables runtime

**Files:**
- Modify: `vantare-v2/frontend/src/index.css`

- [ ] Step 1: Añadir defaults `:root` antes de `body`.

```css
:root {
  --v-bg: #080808;
  --v-surface: #0F0F0F;
  --v-panel: #141414;
  --v-border: #1E1E1E;
  --v-border-hover: #2A2A2A;
  --v-text: #E8E8E8;
  --v-text-muted: #7A7A7A;
  --v-text-dim: #4A4A4A;
  --v-red-400: #E63946;
  --v-red-500: #C1121F;
  --v-red-600: #9B2226;
  --v-red-700: #800020;
  --v-red-900: #4A0012;
  --v-red-950: #2A000A;
  --v-wine: #722F37;
  --v-burgundy: #4A0E16;
  --v-blood: #8B0000;
  --v-success: #34D399;
  --v-warning: #FFD700;
  --v-glass-alpha: 0.6;
  --v-glass-blur: 20px;
  --v-card-shadow: 0 4px 20px rgba(139, 0, 0, 0.1);
  --v-hover-translate-y: -2px;
  --v-motion-scale: 1;
  --v-font-sans: 'Inter', sans-serif;
  --v-font-display: 'Rajdhani', sans-serif;
  --v-font-mono: 'Space Mono', monospace;
}
```

- [ ] Step 2: Cambiar `body`.

```css
body {
  background: var(--v-bg);
  color: var(--v-text);
  font-family: var(--v-font-sans);
}
```

- [ ] Step 3: Cambiar `.premium-bg`.

```css
.premium-bg {
  background-color: var(--v-bg);
  background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

- [ ] Step 4: Cambiar clases compartidas.

```css
.glass-panel {
  background: color-mix(in srgb, var(--v-panel) calc(var(--v-glass-alpha) * 100%), transparent);
  backdrop-filter: blur(var(--v-glass-blur));
  -webkit-backdrop-filter: blur(var(--v-glass-blur));
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.card-sleek:hover {
  transform: translateY(var(--v-hover-translate-y));
  box-shadow: var(--v-card-shadow);
}
```

- [ ] Step 5: Add reduced motion/lite guard.

```css
[data-visual-mode="lite"] .glass-panel,
[data-visual-mode="lite"] .card-sleek,
[data-visual-mode="lite"] .btn-primary,
[data-visual-mode="lite"] .nav-item::after {
  transition: none;
}

[data-visual-mode="lite"] .glass-panel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] Step 6: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 4: Aplicar tema al arrancar

**Files:**
- Modify: `vantare-v2/frontend/src/main.tsx`

- [ ] Step 1: Importar temas y helper.

```ts
import { applyTheme } from "./lib/theme";
import vantareV5 from "./themes/vantare-v5.json";
import vantareLite from "./themes/vantare-lite.json";
```

- [ ] Step 2: Leer preferencia local.

```ts
const themeId = window.localStorage.getItem("vantare.theme") ?? "vantare-v5";
applyTheme(themeId === "vantare-lite" ? vantareLite : vantareV5);
```

- [ ] Step 3: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 5: Toggle Lite mode en Hub

**Files:**
- Modify: `vantare-v2/frontend/src/hub/components/Topbar.tsx`

- [ ] Step 1: Añadir imports.

```ts
import { useEffect, useState } from "react";
import { applyTheme } from "../../lib/theme";
import vantareV5 from "../../themes/vantare-v5.json";
import vantareLite from "../../themes/vantare-lite.json";
```

- [ ] Step 2: Añadir estado.

```ts
const [liteMode, setLiteMode] = useState(() => localStorage.getItem("vantare.theme") === "vantare-lite");
```

- [ ] Step 3: Añadir handler.

```ts
function toggleLiteMode() {
  const next = !liteMode;
  setLiteMode(next);
  const theme = next ? vantareLite : vantareV5;
  localStorage.setItem("vantare.theme", theme.id);
  applyTheme(theme);
}
```

- [ ] Step 4: Añadir botón discreto en topbar junto a notificaciones.

```tsx
<button
  type="button"
  onClick={toggleLiteMode}
  className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold text-vantare-textMuted hover:text-white"
>
  {liteMode ? "Lite ON" : "Lite OFF"}
</button>
```

- [ ] Step 5: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 6: Aplicar variables a widgets overlay

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`

- [ ] Step 1: Cambiar colores dinámicos de Delta a clases/estilos theme-aware si aplica.

Mantener semántica:

```ts
function deltaColor(delta: number): string {
  if (delta < 0) return "text-[var(--v-success)]";
  if (delta > 0) return "text-[var(--v-red-400)]";
  return "text-white/40";
}
```

- [ ] Step 2: Cambiar `barColor`.

```ts
function barColor(delta: number): string {
  if (delta < 0) return "bg-[var(--v-success)]";
  if (delta > 0) return "bg-[var(--v-red-400)]";
  return "bg-white/20";
}
```

- [ ] Step 3: No cambiar layout ni copy.

- [ ] Step 4: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 7: Tests de integración básica de tema

**Files:**
- Modify: `vantare-v2/frontend/src/lib/theme.test.ts`

- [ ] Step 1: Añadir test con los JSON reales.

```ts
import vantareV5 from "../themes/vantare-v5.json";
import vantareLite from "../themes/vantare-lite.json";

it("real themes expose required CSS variables", () => {
  expect(cssVarsFromTheme(vantareV5)["--v-bg"]).toBe("#080808");
  expect(cssVarsFromTheme(vantareLite)["--v-glass-blur"]).toBe("0px");
});
```

- [ ] Step 2: Ejecutar tests.

```powershell
pnpm --dir frontend test -- theme
```

Expected: PASS.

## Task 8: Documentación y evidencia

**Files:**
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`
- Modify: `docs/proyecto/06-DISENO-UI.md`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- Create: `.omo/evidence/v2-f8-themes.txt`

- [ ] Step 1: Añadir a `06-DISENO-UI.md`:

```md
## Temas runtime (Fase 8)

- `frontend/src/themes/vantare-v5.json` contiene tokens aprobados.
- `frontend/src/themes/vantare-lite.json` mantiene la paleta pero reduce blur/sombras/transiciones.
- CSS runtime usa variables `--v-*`.
- `hub_main_v5.html` sigue siendo la referencia visual.
```

- [ ] Step 2: Añadir comandos manuales a `11-COMANDOS-Y-VERIFICACION.md`:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
```

Validar:

```text
Hub abre con diseño v5.
Botón Lite ON/OFF cambia blur/sombras sin romper layout.
Overlay racing sigue transparente.
OBS /overlay sigue sirviendo assets.
```

- [ ] Step 3: Crear evidencia:

```text
Fase 8 — Temas runtime
Fecha:
Comandos:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build
Manual:
- Hub full:
- Hub lite:
- Overlay racing:
- OBS:
Limitaciones:
```

## Criterios de Aceptación

- [ ] `vantare-v5.json` existe y refleja tokens de `hub_main_v5.html`.
- [ ] `vantare-lite.json` existe y reduce blur/sombras/motion.
- [ ] `theme.ts` aplica CSS variables y data attributes.
- [ ] CSS compartido usa `--v-*` para fondo/texto/glass/hover.
- [ ] Hub puede alternar full/lite en runtime.
- [ ] Preferencia se mantiene en `localStorage`.
- [ ] Widgets overlay siguen funcionando.
- [ ] OBS `/overlay` sigue funcionando.
- [ ] No se toca `apps/desktop/`.
- [ ] `go test ./...` pasa.
- [ ] `pnpm --dir frontend test` pasa.
- [ ] `pnpm --dir frontend build` pasa.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cambiar variables rompe estética hub v5 | Mantener defaults idénticos a `index.css` actual y comparar visualmente. |
| Lite mode se convierte en rediseño | Mismos colores/layout; solo reducir efectos caros. |
| Tailwind arbitrary values no detecta clases dinámicas | Usar strings literales estáticos como `text-[var(--v-red-400)]`, no construir clases dinámicas variables. |
| Tema no aplica en OBS | Aplicar tema en `main.tsx` antes de renderizar App. |
| LocalStorage no existe en algún contexto test | Tests usan happy-dom; acceso en runtime principal con fallback simple. |

## Prompt Para Ejecutor Externo

```text
Trabaja en C:\Users\isaac\Desktop\Vantare-Overlays.

Código activo: vantare-v2/ solamente. No tocar apps/desktop/.

Implementa Fase 8 siguiendo:
.omo/plans/v2-f8-themes.md

Objetivo:
Exportar tokens v5 a JSON, aplicar CSS variables runtime y añadir Lite mode sin cambiar la dirección visual aprobada.

Reglas:
- hub_main_v5.html sigue siendo la referencia visual.
- No improvisar colores/layout.
- Lite mode reduce blur/sombras/motion, no rediseña.
- No introducir auth/cloud/marketplace.
- No tocar apps/desktop/.
- No commit/push.

Comandos obligatorios:
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build

Entrega:
- Archivos modificados.
- Resultado de comandos.
- Confirmación manual de Hub full/lite, overlay racing y OBS.
- Limitaciones conocidas.
```
