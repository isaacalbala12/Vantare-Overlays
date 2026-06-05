# Sistema de Temas — Vantare Overlays

Guía completa del sistema de temas, diseño visual y personalización de la apariencia
de los overlays en tiempo real.

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Tema](#2-arquitectura-del-tema)
3. [Theme Token Reference](#3-theme-token-reference)
4. [Theme JSON Format](#4-theme-json-format)
5. [Tailwind CSS v4 Integration](#5-tailwind-css-v4-integration)
6. [Dynamic Theme Switching](#6-dynamic-theme-switching)
7. [Crear Tema Custom](#7-crear-tema-custom)
8. [Override por Overlay](#8-override-por-overlay)
9. [Componentes y Temas](#9-componentes-y-temas)
10. [Exportar / Importar Temas](#10-exportar--importar-temas)
11. [Temas Built-in](#11-temas-built-in)
12. [Persistencia](#12-persistencia)
13. [Accessibility](#13-accessibility)
14. [Performance](#14-performance)

---

## 1. Visión General

El sistema de temas de Vantare Overlays combina **CSS Custom Properties** con
**Tailwind CSS v4** para ofrecer una experiencia de diseño visual fluida,
personalizable en tiempo real y optimizada para streaming.

### Principios fundamentales

| Principio | Descripción |
|---|---|
| **Tokens-first** | Cada valor visual (color, fuente, espaciado, animación) se expone como un token CSS. Nunca se usan valores hardcodeados en componentes. |
| **Runtime switching** | Los temas se pueden cambiar sin recargar la composición. Las CSS variables se actualizan dinámicamente en `document.documentElement`. |
| **Tailwind v4 native** | Los tokens se integran con la directiva `@theme` de Tailwind v4, permitiendo uso de utility classes semánticas. |
| **JSON serializable** | Cada tema es un archivo `.json` que se puede importar, exportar y compartir entre usuarios. |
| **Overlay-scoped** | Los overlays individuales pueden anular tokens del tema global sin afectar a los demás. |

### Flujo de datos

```
ThemeProvider (React Context)
    │
    ├── Lee tema activo de electron-store
    ├── Aplica CSS variables en <html>
    ├── Expone useTheme() hook a componentes
    │
    ├── Tailwind v4 @theme lee las variables
    │       └── Utility classes semánticas disponibles
    │
    └── Componentes consumen tokens via:
            ├── Tailwind classes (bg-surface, text-primary)
            ├── useTheme() hook (valores dinámicos en JS)
            └── var(--token-name) en CSS modules
```

### Requisitos

- Node.js >= 18
- Tailwind CSS v4.2+
- Electron 28+
- TypeScript 5.3+

---

## 2. Arquitectura del Tema

### Estructura de archivos

```
src/
├── themes/
│   ├── types.ts              # Tipados del sistema de temas
│   ├── defaults.ts           # Temas built-in (Dark, Blood, Midnight, etc.)
│   ├── ThemeProvider.tsx      # React Context + aplicacion de CSS vars
│   ├── useTheme.ts           # Hook principal
│   ├── useOverlayTheme.ts    # Hook con scope por overlay
│   ├── theme-utils.ts        # Utilidades (merge, validacion, contraste)
│   └── export-import.ts      # Serializacion JSON
├── styles/
│   ├── theme-tokens.css      # Definicion de CSS variables base
│   └── theme-tailwind.css    # Directiva @theme para Tailwind v4
└── components/
    ├── GlassPanel.tsx
    ├── DeltaIndicator.tsx
    ├── AlertBanner.tsx
    └── ...
```

### Capas del sistema

```
┌─────────────────────────────────────────────┐
│  Capa de Presentacion (Componentes React)   │
│  GlassPanel, DeltaIndicator, AlertBanner    │
├─────────────────────────────────────────────┤
│  Capa de Hooks (useTheme, useOverlayTheme)  │
│  Lee/escribe tema activo, expone tokens     │
├─────────────────────────────────────────────┤
│  Capa de Contexto (ThemeProvider)           │
│  React Context, sincronizacion electron     │
├─────────────────────────────────────────────┤
│  Capa CSS (CSS Variables + Tailwind v4)     │
│  --color-surface, --font-heading, etc.      │
├─────────────────────────────────────────────┤
│  Capa de Persistencia (electron-store)      │
│  Serializacion, cache, tema por overlay     │
└─────────────────────────────────────────────┘
```

### Flujo de inicializacion

1. La aplicacion arranca y `ThemeProvider` se monta.
2. Se lee el tema activo desde `electron-store` (o se usa el default).
3. Se resuelven los overrides del overlay actual (si existen).
4. Se inyectan las CSS variables en `document.documentElement`.
5. Tailwind v4 lee las variables via `@theme` y genera las utility classes.
6. Los componentes renderizan usando tokens semánticos.

---

## 3. Theme Token Reference

A continuacion se documenta **todos** los tokens disponibles en el sistema.
Cada token se expone como `--token-name` en CSS y como `theme.tokenName` en JS.

### Colores

| Token | CSS Variable | Tipo | Default (Dark) | Descripcion |
|---|---|---|---|---|
| `color.surface` | `--color-surface` | `string` | `#0f0f14` | Color de fondo principal del overlay |
| `color.surfaceAlt` | `--color-surface-alt` | `string` | `#1a1a24` | Fondo alternativo (headers, secciones) |
| `color.surfaceElevated` | `--color-surface-elevated` | `string` | `#24243a` | Superficies elevadas (modales, tooltips) |
| `color.border` | `--color-border` | `string` | `#2a2a3e` | Color de bordes y separadores |
| `color.borderSubtle` | `--color-border-subtle` | `string` | `#1e1e2e` | Bordes sutiles, divisiones internas |
| `color.primary` | `--color-primary` | `string` | `#6c5ce7` | Color primario de acento |
| `color.primaryHover` | `--color-primary-hover` | `string` | `#7c6cf7` | Variante hover del primario |
| `color.primaryMuted` | `--color-primary-muted` | `string` | `#6c5ce720` | Primario con opacidad reducida |
| `color.secondary` | `--color-secondary` | `string` | `#00cec9` | Color secundario de acento |
| `color.secondaryHover` | `--color-secondary-hover` | `string` | `#1eded9` | Variante hover del secundario |
| `color.text` | `--color-text` | `string` | `#e8e8f0` | Texto principal |
| `color.textMuted` | `--color-text-muted` | `string` | `#8888a0` | Texto secundario / deshabilitado |
| `color.textInverse` | `--color-text-inverse` | `string` | `#0f0f14` | Texto sobre fondos claros |
| `color.positive` | `--color-positive` | `string` | `#00b894` | Indicadores de ganancia (delta+) |
| `color.negative` | `--color-negative` | `string` | `#e17055` | Indicadores de perdida (delta-) |
| `color.warning` | `--color-warning` | `string` | `#fdcb6e` | Advertencias |
| `color.danger` | `--color-danger` | `string` | `#d63031` | Errores criticos |
| `color.glass` | `--color-glass` | `string` | `#ffffff08` | Fondo de paneles glassmorphism |
| `color.glassBorder` | `--color-glass-border` | `string` | `#ffffff12` | Bordes de paneles glassmorphism |
| `color.overlay` | `--color-overlay` | `string` | `#00000080` | Overlay de sombreado (modales) |

### Tipografia

| Token | CSS Variable | Tipo | Default (Dark) | Descripcion |
|---|---|---|---|---|
| `font.heading` | `--font-heading` | `string` | `'Inter', sans-serif` | Fuente para titulos |
| `font.body` | `--font-body` | `string` | `'Inter', sans-serif` | Fuente para cuerpo de texto |
| `font.mono` | `--font-mono` | `string` | `'JetBrains Mono', monospace` | Fuente monoespaciada (numeros, codigo) |
| `font.size.xs` | `--font-size-xs` | `string` | `0.75rem` | Tamano extra pequeno |
| `font.size.sm` | `--font-size-sm` | `string` | `0.875rem` | Tamano pequeno |
| `font.size.base` | `--font-size-base` | `string` | `1rem` | Tamano base |
| `font.size.lg` | `--font-size-lg` | `string` | `1.25rem` | Tamano grande |
| `font.size.xl` | `--font-size-xl` | `string` | `1.5rem` | Tamano extra grande |
| `font.size.2xl` | `--font-size-2xl` | `string` | `2rem` | Tamano display |
| `font.weight.normal` | `--font-weight-normal` | `number` | `400` | Peso normal |
| `font.weight.medium` | `--font-weight-medium` | `number` | `500` | Peso medio |
| `font.weight.semibold` | `--font-weight-semibold` | `number` | `600` | Peso semibold |
| `font.weight.bold` | `--font-weight-bold` | `number` | `700` | Peso bold |

### Espaciado

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `spacing.xs` | `--spacing-xs` | `string` | `0.25rem` | Espaciado micro (4px) |
| `spacing.sm` | `--spacing-sm` | `string` | `0.5rem` | Espaciado pequeno (8px) |
| `spacing.md` | `--spacing-md` | `string` | `1rem` | Espaciado medio (16px) |
| `spacing.lg` | `--spacing-lg` | `string` | `1.5rem` | Espaciado grande (24px) |
| `spacing.xl` | `--spacing-xl` | `string` | `2rem` | Espaciado extra (32px) |
| `spacing.2xl` | `--spacing-2xl` | `string` | `3rem` | Espaciado doble (48px) |

### Bordes y Radios

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `radius.sm` | `--radius-sm` | `string` | `0.375rem` | Radio pequeno (6px) |
| `radius.md` | `--radius-md` | `string` | `0.5rem` | Radio medio (8px) |
| `radius.lg` | `--radius-lg` | `string` | `0.75rem` | Radio grande (12px) |
| `radius.xl` | `--radius-xl` | `string` | `1rem` | Radio extra (16px) |
| `radius.full` | `--radius-full` | `string` | `9999px` | Circular / pill |

### Sombras

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `shadow.sm` | `--shadow-sm` | `string` | `0 1px 2px #00000040` | Sombra sutil |
| `shadow.md` | `--shadow-md` | `string` | `0 4px 12px #00000060` | Sombra media |
| `shadow.lg` | `--shadow-lg` | `string` | `0 8px 32px #00000080` | Sombra grande |
| `shadow.glow` | `--shadow-glow` | `string` | `0 0 20px var(--color-primary)40` | Brillo del color primario |

### Animacion

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `animation.duration.fast` | `--animation-duration-fast` | `string` | `150ms` | Animaciones rapidas (hover, focus) |
| `animation.duration.normal` | `--animation-duration-normal` | `string` | `300ms` | Animaciones estandar (transiciones) |
| `animation.duration.slow` | `--animation-duration-slow` | `string` | `500ms` | Animaciones lentas (entradas/salidas) |
| `animation.duration.slowest` | `--animation-duration-slowest` | `string` | `800ms` | Animaciones muy lentas (revelados) |
| `animation.easing.default` | `--animation-easing-default` | `string` | `cubic-bezier(0.4, 0, 0.2, 1)` | Easing estandar |
| `animation.easing.bounce` | `--animation-easing-bounce` | `string` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Easing con rebote |
| `animation.easing.sharp` | `--animation-easing-sharp` | `string` | `cubic-bezier(0.4, 0, 0.6, 1)` | Easing abrupto |

### Glassmorphism

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `glass.blur` | `--glass-blur` | `string` | `12px` | Intensidad de blur |
| `glass.opacity` | `--glass-opacity` | `number` | `0.6` | Opacidad del fondo glass |
| `glass.saturation` | `--glass-saturation` | `string` | `180%` | Saturacion del fondo filtrado |

### Z-Index

| Token | CSS Variable | Tipo | Default | Descripcion |
|---|---|---|---|---|
| `z.base` | `--z-base` | `number` | `1` | Capa base |
| `z.overlay` | `--z-overlay` | `number` | `10` | Superposiciones |
| `z.dropdown` | `--z-dropdown` | `number` | `20` | Menus desplegables |
| `z.modal` | `--z-modal` | `number` | `50` | Modales |
| `z.toast` | `--z-toast` | `number` | `100` | Notificaciones toast |
| `z.tooltip` | `--z-tooltip` | `number` | `200` | Tooltips |

**Total de tokens: 56**

---
## 4. Theme JSON Format

Cada tema se define como un archivo JSON que respeta el schema tipado.
Este es el formato completo con todos los campos disponibles.

### Schema completo

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "id": "string — identificador unico del tema",
  "name": "string — nombre legible para humanos",
  "description": "string — descripcion corta del tema",
  "author": "string — autor del tema",
  "version": "string — version semver",
  "parent": "string | null — ID del tema del que hereda (para overrides parciales)",
  "tokens": {
    "color": {
      "surface": "#hex | rgb() | hsl()",
      "surfaceAlt": "#hex | rgb() | hsl()",
      "surfaceElevated": "#hex | rgb() | hsl()",
      "border": "#hex | rgb() | hsl()",
      "borderSubtle": "#hex | rgb() | hsl()",
      "primary": "#hex | rgb() | hsl()",
      "primaryHover": "#hex | rgb() | hsl()",
      "primaryMuted": "#hex | rgb() | hsl()",
      "secondary": "#hex | rgb() | hsl()",
      "secondaryHover": "#hex | rgb() | hsl()",
      "text": "#hex | rgb() | hsl()",
      "textMuted": "#hex | rgb() | hsl()",
      "textInverse": "#hex | rgb() | hsl()",
      "positive": "#hex | rgb() | hsl()",
      "negative": "#hex | rgb() | hsl()",
      "warning": "#hex | rgb() | hsl()",
      "danger": "#hex | rgb() | hsl()",
      "glass": "#hex | rgb() | hsl()",
      "glassBorder": "#hex | rgb() | hsl()",
      "overlay": "#hex | rgb() | hsl()"
    },
    "font": {
      "heading": "string — familia tipografica",
      "body": "string — familia tipografica",
      "mono": "string — familia tipografica",
      "size": {
        "xs": "string — tamaño CSS",
        "sm": "string — tamaño CSS",
        "base": "string — tamaño CSS",
        "lg": "string — tamaño CSS",
        "xl": "string — tamaño CSS",
        "2xl": "string — tamaño CSS"
      },
      "weight": {
        "normal": "number — peso CSS",
        "medium": "number",
        "semibold": "number",
        "bold": "number"
      }
    },
    "spacing": {
      "xs": "string — tamaño CSS",
      "sm": "string",
      "md": "string",
      "lg": "string",
      "xl": "string",
      "2xl": "string"
    },
    "radius": {
      "sm": "string",
      "md": "string",
      "lg": "string",
      "xl": "string",
      "full": "string"
    },
    "shadow": {
      "sm": "string — valor box-shadow",
      "md": "string",
      "lg": "string",
      "glow": "string"
    },
    "animation": {
      "duration": {
        "fast": "string — duracion CSS",
        "normal": "string",
        "slow": "string",
        "slowest": "string"
      },
      "easing": {
        "default": "string — cubic-bezier",
        "bounce": "string",
        "sharp": "string"
      }
    },
    "glass": {
      "blur": "string — tamaño CSS",
      "opacity": "number — 0 a 1",
      "saturation": "string — porcentaje CSS"
    },
    "z": {
      "base": "number",
      "overlay": "number",
      "dropdown": "number",
      "modal": "number",
      "toast": "number",
      "tooltip": "number"
    }
  }
}
```

### Ejemplo: Tema completo "Neon Surge"

```json
{
  "id": "neon-surge",
  "name": "Neon Surge",
  "description": "Tema vibrante con colores neon sobre fondo oscuro profundo",
  "author": "Vantare",
  "version": "1.0.0",
  "parent": null,
  "tokens": {
    "color": {
      "surface": "#0a0a12",
      "surfaceAlt": "#12121e",
      "surfaceElevated": "#1a1a2e",
      "border": "#2a2a4e",
      "borderSubtle": "#1e1e38",
      "primary": "#ff006e",
      "primaryHover": "#ff2080",
      "primaryMuted": "#ff006e25",
      "secondary": "#00f5d4",
      "secondaryHover": "#33f7dc",
      "text": "#eaeaff",
      "textMuted": "#7878a0",
      "textInverse": "#0a0a12",
      "positive": "#00f5d4",
      "negative": "#ff006e",
      "warning": "#fee440",
      "danger": "#ff006e",
      "glass": "#ffffff06",
      "glassBorder": "#ffffff10",
      "overlay": "#00000090"
    },
    "font": {
      "heading": "'Orbitron', sans-serif",
      "body": "'Inter', sans-serif",
      "mono": "'JetBrains Mono', monospace",
      "size": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.25rem",
        "xl": "1.5rem",
        "2xl": "2rem"
      },
      "weight": {
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      }
    },
    "spacing": {
      "xs": "0.25rem",
      "sm": "0.5rem",
      "md": "1rem",
      "lg": "1.5rem",
      "xl": "2rem",
      "2xl": "3rem"
    },
    "radius": {
      "sm": "0.25rem",
      "md": "0.5rem",
      "lg": "0.75rem",
      "xl": "1rem",
      "full": "9999px"
    },
    "shadow": {
      "sm": "0 1px 4px #ff006e30",
      "md": "0 4px 16px #ff006e40",
      "lg": "0 8px 40px #ff006e60",
      "glow": "0 0 30px #ff006e80"
    },
    "animation": {
      "duration": {
        "fast": "120ms",
        "normal": "250ms",
        "slow": "450ms",
        "slowest": "700ms"
      },
      "easing": {
        "default": "cubic-bezier(0.4, 0, 0.2, 1)",
        "bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "sharp": "cubic-bezier(0.4, 0, 0.6, 1)"
      }
    },
    "glass": {
      "blur": "16px",
      "opacity": 0.5,
      "saturation": "200%"
    },
    "z": {
      "base": 1,
      "overlay": 10,
      "dropdown": 20,
      "modal": 50,
      "toast": 100,
      "tooltip": 200
    }
  }
}
```

### Ejemplo: Tema parcial con herencia

```json
{
  "id": "my-dark-override",
  "name": "Mi Dark Override",
  "description": "Override del tema Dark con acentos personalizados",
  "author": "Usuario",
  "version": "1.0.0",
  "parent": "dark",
  "tokens": {
    "color": {
      "primary": "#ff9f43",
      "primaryHover": "#ffad63",
      "primaryMuted": "#ff9f4325",
      "secondary": "#54a0ff"
    }
  }
}
```

Cuando `parent` esta definido, el sistema fusiona los tokens del tema padre
con los del override. Solo los campos especificados se sobreescriben.

---

## 5. Tailwind CSS v4 Integration

Vantare Overlays utiliza la arquitectura de Tailwind CSS v4 con la directiva
`@theme` para conectar las CSS variables del sistema de temas con las utility
classes de Tailwind.

### Definicion del theme-tokens.css

Este archivo define todas las CSS variables en `:root` para que esten
disponibles globalmente:

```css
/* src/styles/theme-tokens.css */
:root {
  /* Colores */
  --color-surface: #0f0f14;
  --color-surface-alt: #1a1a24;
  --color-surface-elevated: #24243a;
  --color-border: #2a2a3e;
  --color-border-subtle: #1e1e2e;
  --color-primary: #6c5ce7;
  --color-primary-hover: #7c6cf7;
  --color-primary-muted: #6c5ce720;
  --color-secondary: #00cec9;
  --color-secondary-hover: #1eded9;
  --color-text: #e8e8f0;
  --color-text-muted: #8888a0;
  --color-text-inverse: #0f0f14;
  --color-positive: #00b894;
  --color-negative: #e17055;
  --color-warning: #fdcb6e;
  --color-danger: #d63031;
  --color-glass: #ffffff08;
  --color-glass-border: #ffffff12;
  --color-overlay: #00000080;

  /* Tipografia */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Espaciado */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Radios */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px #00000040;
  --shadow-md: 0 4px 12px #00000060;
  --shadow-lg: 0 8px 32px #00000080;
  --shadow-glow: 0 0 20px color-mix(in srgb, var(--color-primary) 40%, transparent);

  /* Animacion */
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;
  --animation-duration-slowest: 800ms;
  --animation-easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --animation-easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --animation-easing-sharp: cubic-bezier(0.4, 0, 0.6, 1);

  /* Glassmorphism */
  --glass-blur: 12px;
  --glass-opacity: 0.6;
  --glass-saturation: 180%;

  /* Z-Index */
  --z-base: 1;
  --z-overlay: 10;
  --z-dropdown: 20;
  --z-modal: 50;
  --z-toast: 100;
  --z-tooltip: 200;
}
```

### Directiva @theme en Tailwind v4

Este archivo conecta las variables CSS con el sistema de utilidades de Tailwind:

```css
/* src/styles/theme-tailwind.css */
@import "tailwindcss";

@theme {
  /* Colores */
  --color-surface: var(--color-surface);
  --color-surface-alt: var(--color-surface-alt);
  --color-surface-elevated: var(--color-surface-elevated);
  --color-border: var(--color-border);
  --color-border-subtle: var(--color-border-subtle);
  --color-primary: var(--color-primary);
  --color-primary-hover: var(--color-primary-hover);
  --color-primary-muted: var(--color-primary-muted);
  --color-secondary: var(--color-secondary);
  --color-secondary-hover: var(--color-secondary-hover);
  --color-text: var(--color-text);
  --color-text-muted: var(--color-text-muted);
  --color-text-inverse: var(--color-text-inverse);
  --color-positive: var(--color-positive);
  --color-negative: var(--color-negative);
  --color-warning: var(--color-warning);
  --color-danger: var(--color-danger);
  --color-glass: var(--color-glass);
  --color-glass-border: var(--color-glass-border);

  /* Fuentes */
  --font-heading: var(--font-heading);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);

  /* Animacion */
  --animate-fade-in: fade-in var(--animation-duration-normal) var(--animation-easing-default);
  --animate-slide-up: slide-up var(--animation-duration-normal) var(--animation-easing-default);
  --animate-scale-in: scale-in var(--animation-duration-fast) var(--animation-easing-bounce);
  --animate-glow-pulse: glow-pulse 2s var(--animation-easing-default) infinite;

  /* Keyframes */
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 10px var(--color-primary-muted); }
    50% { box-shadow: 0 0 25px var(--color-primary-muted); }
  }
}
```

### Uso en componentes

```tsx
// Ejemplo de uso con Tailwind v4
function DeltaIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;

  return (
    <span
      className={`
        font-mono text-sm font-semibold
        px-md py-xs rounded-md
        transition-colors duration-normal
        ${isPositive
          ? 'text-positive bg-positive/10'
          : 'text-negative bg-negative/10'
        }
      `}
    >
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}
```

### Classes disponibles

Con la integracion `@theme`, las siguientes classes estan disponibles en
todo el proyecto:

| Clase Tailwind | Equivalente CSS |
|---|---|
| `bg-surface` | `background-color: var(--color-surface)` |
| `bg-surface-alt` | `background-color: var(--color-surface-alt)` |
| `bg-surface-elevated` | `background-color: var(--color-surface-elevated)` |
| `text-primary` | `color: var(--color-primary)` |
| `text-secondary` | `color: var(--color-secondary)` |
| `text-text` | `color: var(--color-text)` |
| `text-text-muted` | `color: var(--color-text-muted)` |
| `border-border` | `border-color: var(--color-border)` |
| `border-border-subtle` | `border-color: var(--color-border-subtle)` |
| `font-heading` | `font-family: var(--font-heading)` |
| `font-body` | `font-family: var(--font-body)` |
| `font-mono` | `font-family: var(--font-mono)` |
| `rounded-sm` ... `rounded-full` | Usa `--radius-*` |
| `shadow-sm` ... `shadow-lg` | Usa `--shadow-*` |
| `animate-fade-in` | Animacion de entrada fade |
| `animate-slide-up` | Animacion de entrada slide |
| `animate-scale-in` | Animacion de entrada scale |
| `animate-glow-pulse` | Pulso de brillo continuo |

---

## 6. Dynamic Theme Switching

El sistema permite cambiar temas en tiempo real sin recargar la composicion.
Esto es fundamental para streamers que quieren ajustar su overlay durante
una sesion de streaming.

### useTheme() Hook

El hook principal expone el tema activo, todas las funciones de cambio
y la lista de temas disponibles:

```typescript
// src/themes/useTheme.ts
import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import type { Theme, ThemeTokenMap } from './types';

interface UseThemeReturn {
  /** Tema activo actual */
  theme: Theme;
  /** ID del tema activo */
  themeId: string;
  /** Mapa de tokens resueltos (incluyendo overrides) */
  tokens: ThemeTokenMap;
  /** Cambiar a otro tema registrado */
  setTheme: (themeId: string) => void;
  /** Actualizar un token individual del tema activo */
  setToken: <K extends keyof ThemeTokenMap>(
    category: K,
    token: keyof ThemeTokenMap[K],
    value: string | number
  ) => void;
  /** Aplicar un override parcial para el overlay actual */
  applyOverlayOverride: (override: Partial<ThemeTokenMap>) => void;
  /** Eliminar todos los overrides del overlay actual */
  clearOverlayOverride: () => void;
  /** Lista de temas disponibles */
  availableThemes: Array<{ id: string; name: string; description: string }>;
  /** Tema oscuro o claro (para decidir contraste) */
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
```

### Ejemplo: Selector de tema en UI

```tsx
import { useTheme } from '../themes/useTheme';

function ThemeSelector() {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div className="flex flex-col gap-sm">
      <label className="text-text-muted text-sm font-medium">
        Tema del overlay
      </label>
      <div className="flex flex-col gap-xs">
        {availableThemes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`
              px-md py-sm rounded-lg text-left
              transition-all duration-fast
              ${t.id === themeId
                ? 'bg-primary/15 border border-primary/30 text-primary'
                : 'bg-surface-alt border border-border-subtle text-text-muted hover:bg-surface-elevated hover:text-text'
              }
            `}
          >
            <span className="font-medium">{t.name}</span>
            <span className="text-xs opacity-60 ml-sm">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Ejemplo: Edicion de tokens en tiempo real

```tsx
import { useTheme } from '../themes/useTheme';

function ColorPicker() {
  const { tokens, setToken } = useTheme();

  return (
    <div className="flex flex-col gap-md p-lg bg-surface rounded-xl border border-border">
      <h3 className="text-text font-heading text-lg font-semibold">
        Personalizar Colores
      </h3>

      <div className="flex items-center gap-sm">
        <label className="text-text-muted text-sm w-24">Primario</label>
        <input
          type="color"
          value={tokens.color.primary}
          onChange={(e) => setToken('color', 'primary', e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <span className="text-text font-mono text-xs">
          {tokens.color.primary}
        </span>
      </div>

      <div className="flex items-center gap-sm">
        <label className="text-text-muted text-sm w-24">Secundario</label>
        <input
          type="color"
          value={tokens.color.secondary}
          onChange={(e) => setToken('color', 'secondary', e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <span className="text-text font-mono text-xs">
          {tokens.color.secondary}
        </span>
      </div>

      <div className="flex items-center gap-sm">
        <label className="text-text-muted text-sm w-24">Fondo</label>
        <input
          type="color"
          value={tokens.color.surface}
          onChange={(e) => setToken('color', 'surface', e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <span className="text-text font-mono text-xs">
          {tokens.color.surface}
        </span>
      </div>
    </div>
  );
}
```

### Mecanismo de aplicacion

Cuando se cambia un tema o token, el sistema ejecuta estas operaciones:

```typescript
// Internamente en ThemeProvider
function applyThemeToDOM(tokens: ThemeTokenMap) {
  const root = document.documentElement;

  // Colores
  root.style.setProperty('--color-surface', tokens.color.surface);
  root.style.setProperty('--color-surface-alt', tokens.color.surfaceAlt);
  root.style.setProperty('--color-primary', tokens.color.primary);
  // ... todos los tokens

  // Fuentes
  root.style.setProperty('--font-heading', tokens.font.heading);
  root.style.setProperty('--font-body', tokens.font.body);

  // Animacion
  root.style.setProperty('--animation-duration-fast', tokens.animation.duration.fast);
  // ... todos los tokens
}
```

---
## 7. Crear Tema Custom

Guia paso a paso para crear un tema personalizado desde cero.

### Paso 1: Definir la paleta de colores

Antes de escribir codigo, define tu paleta visual. Herramientas recomendadas:
- [Coolors](https://coolors.co) — generador de paletas
- [Realtime Colors](https://www.realtimecolors.com) — preview en tiempo real
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors) — referencia

### Paso 2: Crear el archivo JSON

Crea un archivo en `src/themes/custom/` con el formato del schema:

```json
{
  "id": "ocean-breeze",
  "name": "Ocean Breeze",
  "description": "Tema relajante con tonos oceánicos y glassmorphism suave",
  "author": "Tu Nombre",
  "version": "1.0.0",
  "parent": "dark",
  "tokens": {
    "color": {
      "surface": "#0b1426",
      "surfaceAlt": "#111d35",
      "surfaceElevated": "#182744",
      "border": "#1e3a5f",
      "borderSubtle": "#162d4d",
      "primary": "#00b4d8",
      "primaryHover": "#33c4e0",
      "primaryMuted": "#00b4d820",
      "secondary": "#90e0ef",
      "secondaryHover": "#a6e8f3",
      "text": "#e0f4ff",
      "textMuted": "#6b93b8",
      "textInverse": "#0b1426",
      "positive": "#48cae4",
      "negative": "#e76f51",
      "warning": "#f4d35e",
      "danger": "#e63946",
      "glass": "#ffffff08",
      "glassBorder": "#ffffff12",
      "overlay": "#00000080"
    },
    "font": {
      "heading": "'Poppins', sans-serif",
      "body": "'Inter', sans-serif",
      "mono": "'JetBrains Mono', monospace"
    }
  }
}
```

### Paso 3: Registrar el tema

Abre `src/themes/defaults.ts` y agrega tu tema al array de temas built-in
o registralo en el ThemeProvider:

```typescript
// src/themes/defaults.ts
import oceanBreeze from './custom/ocean-breeze.json';

export const builtInThemes: Theme[] = [
  darkTheme,
  bloodTheme,
  midnightTheme,
  midnightOceanTheme,
  oceanBreeze as Theme,  // Tu tema personalizado
];
```

### Paso 4: Cargar fuente personalizada (opcional)

Si usas una fuente que no esta en los temas built-in, agregala en
`index.html` o en tu archivo de estilos global:

```html
<!-- index.html -->
<link
  rel="preconnect"
  href="https://fonts.googleapis.com"
/>
<link
  rel="preconnect"
  href="https://fonts.gstatic.com"
  crossorigin
/>
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Paso 5: Probar el tema

1. Inicia la aplicacion en modo desarrollo.
2. Abre el panel de configuracion del overlay.
3. Selecciona tu nuevo tema en el selector.
4. Verifica que todos los tokens se aplican correctamente.
5. Prueba el cambio en tiempo real (oscuro a tu tema y viceversa).

### Paso 6: Validar accesibilidad

Ejecuta la herramienta de validacion de contraste:

```typescript
import { validateThemeContrast } from '../themes/theme-utils';

const result = validateThemeContrast(oceanBreeze);
console.log(result);
// {
//   passed: true,
//   pairs: [
//     { fg: '#e0f4ff', bg: '#0b1426', ratio: 12.4, level: 'AAA' },
//     { fg: '#6b93b8', bg: '#0b1426', ratio: 4.8, level: 'AA' },
//   ]
// }
```

---

## 8. Override por Overlay

Los overlays individuales pueden anular tokens del tema global sin afectar
a los demas. Esto es util cuando un overlay necesita un color de acento
diferente o un tamano de fuente especifico.

### useOverlayTheme() Hook

```typescript
// src/themes/useOverlayTheme.ts
import { useCallback } from 'react';
import { useTheme } from './useTheme';
import type { ThemeTokenMap, OverlayThemeOverride } from './types';

interface UseOverlayThemeReturn {
  /** Tokens efectivos (global + overrides del overlay) */
  tokens: ThemeTokenMap;
  /** Overrides activos para este overlay */
  overrides: Partial<ThemeTokenMap>;
  /** Establecer un override individual */
  setOverride: <K extends keyof ThemeTokenMap>(
    category: K,
    token: keyof ThemeTokenMap[K],
    value: string | number
  ) => void;
  /** Aplicar multiples overrides de una vez */
  setOverrides: (overrides: Partial<ThemeTokenMap>) => void;
  /** Eliminar todos los overrides */
  clearOverrides: () => void;
  /** Verificar si un token tiene override activo */
  isOverridden: <K extends keyof ThemeTokenMap>(
    category: K,
    token: keyof ThemeTokenMap[K]
  ) => boolean;
}

export function useOverlayTheme(overlayId: string): UseOverlayThemeReturn {
  const { tokens: globalTokens, applyOverlayOverride, clearOverlayOverride } = useTheme();

  const overrides = getStoredOverrides(overlayId);

  const tokens = mergeTokens(globalTokens, overrides);

  const setOverride = useCallback(
    <K extends keyof ThemeTokenMap>(
      category: K,
      token: keyof ThemeTokenMap[K],
      value: string | number
    ) => {
      const current = getStoredOverrides(overlayId);
      const updated = {
        ...current,
        [category]: {
          ...(current[category] as Record<string, unknown>),
          [token as string]: value,
        },
      };
      storeOverrides(overlayId, updated);
      applyOverlayOverride(updated);
    },
    [overlayId, applyOverlayOverride]
  );

  return {
    tokens,
    overrides,
    setOverride,
    setOverrides: (newOverrides) => {
      storeOverrides(overlayId, newOverrides);
      applyOverlayOverride(newOverrides);
    },
    clearOverrides: () => {
      clearStoredOverrides(overlayId);
      clearOverlayOverride();
    },
    isOverridden: (category, token) => {
      return (
        overrides[category] !== undefined &&
        (overrides[category] as Record<string, unknown>)[token as string] !== undefined
      );
    },
  };
}
```

### Ejemplo: Override de color por overlay

```tsx
import { useOverlayTheme } from '../themes/useOverlayTheme';

function OverlaySettings({ overlayId }: { overlayId: string }) {
  const { tokens, setOverride, isOverridden, clearOverrides } =
    useOverlayTheme(overlayId);

  return (
    <div className="flex flex-col gap-lg p-lg bg-surface rounded-xl border border-border">
      <h3 className="text-text font-heading text-lg font-semibold">
        Configuracion del Overlay
      </h3>

      <div className="flex items-center gap-sm">
        <label className="text-text-muted text-sm w-32">
          Color de acento
          {isOverridden('color', 'primary') && (
            <span className="text-primary text-xs ml-xs">(override)</span>
          )}
        </label>
        <input
          type="color"
          value={tokens.color.primary}
          onChange={(e) => setOverride('color', 'primary', e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
      </div>

      <button
        onClick={clearOverrides}
        className="text-text-muted text-sm underline hover:text-text transition-colors duration-fast"
      >
        Restaurar tema global
      </button>
    </div>
  );
}
```

### Persistencia de overrides

Los overrides se guardan por overlay ID en `electron-store`:

```typescript
// Estructura en electron-store
{
  "overlayThemeOverrides": {
    "overlay-abc-123": {
      "color": {
        "primary": "#ff6b6b"
      }
    },
    "overlay-def-456": {
      "color": {
        "primary": "#51cf66",
        "secondary": "#ffd43b"
      },
      "font": {
        "heading": "'Space Grotesk', sans-serif"
      }
    }
  }
}
```

---

## 9. Componentes y Temas

Todos los componentes de la UI consumen tokens del sistema de temas.
Aqui se documenta como cada componente principal interactua con los tokens.

### GlassPanel

El componente de panel glassmorphism es el mas dependiente del sistema de
temas, consumiendo tokens de color, glass, sombras y radios:

```tsx
// src/components/GlassPanel.tsx
import { useTheme } from '../themes/useTheme';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function GlassPanel({
  children,
  className = '',
  elevated = false,
}: GlassPanelProps) {
  const { tokens } = useTheme();

  const style: React.CSSProperties = {
    backgroundColor: elevated
      ? tokens.color.surfaceElevated
      : `color-mix(in srgb, ${tokens.color.surface} ${tokens.glass.opacity * 100}%, transparent)`,
    backdropFilter: `blur(${tokens.glass.blur}) saturate(${tokens.glass.saturation})`,
    WebkitBackdropFilter: `blur(${tokens.glass.blur}) saturate(${tokens.glass.saturation})`,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.color.glassBorder,
    borderRadius: tokens.radius.lg,
    boxShadow: elevated ? tokens.shadow.lg : tokens.shadow.sm,
    padding: tokens.spacing.lg,
  };

  return (
    <div className={`animate-fade-in ${className}`} style={style}>
      {children}
    </div>
  );
}
```

### DeltaIndicator

Muestra variaciones positivas/negativas usando colores semánticos del tema:

```tsx
// src/components/DeltaIndicator.tsx
import { useTheme } from '../themes/useTheme';

interface DeltaIndicatorProps {
  value: number;
  format?: 'percent' | 'currency' | 'number';
  prefix?: string;
  className?: string;
}

export function DeltaIndicator({
  value,
  format = 'percent',
  prefix = '',
  className = '',
}: DeltaIndicatorProps) {
  const { tokens } = useTheme();
  const isPositive = value >= 0;

  const formatValue = (v: number): string => {
    switch (format) {
      case 'percent':
        return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
      case 'currency':
        return `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`;
      case 'number':
        return `${v >= 0 ? '+' : ''}${v.toFixed(0)}`;
      default:
        return String(v);
    }
  };

  const color = isPositive ? tokens.color.positive : tokens.color.negative;
  const bgColor = isPositive
    ? `color-mix(in srgb, ${tokens.color.positive} 12%, transparent)`
    : `color-mix(in srgb, ${tokens.color.negative} 12%, transparent)`;

  return (
    <span
      className={`font-mono text-sm font-semibold inline-flex items-center gap-xs px-sm py-xs rounded-md transition-colors ${className}`}
      style={{
        color,
        backgroundColor: bgColor,
      }}
    >
      {isPositive ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2L10 8H2L6 2Z" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10L2 4H10L6 10Z" />
        </svg>
      )}
      {prefix}{formatValue(value)}
    </span>
  );
}
```

### AlertBanner

Banner de notificaciones que usa tokens de color semanticos:

```tsx
// src/components/AlertBanner.tsx
import { useTheme } from '../themes/useTheme';

interface AlertBannerProps {
  type: 'positive' | 'negative' | 'warning' | 'danger';
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function AlertBanner({
  type,
  message,
  dismissible = false,
  onDismiss,
}: AlertBannerProps) {
  const { tokens } = useTheme();

  const colorMap = {
    positive: tokens.color.positive,
    negative: tokens.color.negative,
    warning: tokens.color.warning,
    danger: tokens.color.danger,
  };

  const color = colorMap[type];
  const bgColor = `color-mix(in srgb, ${color} 12%, transparent)`;
  const borderColor = `color-mix(in srgb, ${color} 30%, transparent)`;

  return (
    <div
      className="flex items-center gap-sm px-md py-sm rounded-lg animate-slide-up"
      style={{
        backgroundColor: bgColor,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        color,
      }}
    >
      <span className="text-sm font-medium">{message}</span>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

### Patron de consumo de tokens

Todos los componentes siguen el mismo patron:

1. Llaman `useTheme()` o `useOverlayTheme(overlayId)` al inicio.
2. Extraen los tokens necesarios del objeto `tokens`.
3. Aplican valores via `style` prop o utility classes de Tailwind.
4. **Nunca** usan valores hardcodeados — siempre tokens.

```typescript
// Patron correcto
const { tokens } = useTheme();
style={{ color: tokens.color.primary, padding: tokens.spacing.md }}

// ❌ Patron incorrecto
style={{ color: '#6c5ce7', padding: '1rem' }}
```

---

## 10. Exportar / Importar Temas

El sistema permite exportar e importar temas como archivos JSON para
compartirlos entre usuarios o entre instalaciones de Vantare.

### Funciones de exportacion

```typescript
// src/themes/export-import.ts
import type { Theme, ThemeTokenMap } from './types';

/**
 * Serializa un tema completo a JSON string.
 */
export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Descarga un tema como archivo .json.
 */
export function downloadTheme(theme: Theme): void {
  const json = exportTheme(theme);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `vantare-theme-${theme.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Valida un JSON importado contra el schema de temas.
 */
export function validateThemeJSON(json: string): {
  valid: boolean;
  theme?: Theme;
  errors?: string[];
} {
  try {
    const parsed = JSON.parse(json);
    const errors: string[] = [];

    if (!parsed.id || typeof parsed.id !== 'string') {
      errors.push('Campo "id" es requerido y debe ser string');
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      errors.push('Campo "name" es requerido y debe ser string');
    }
    if (!parsed.tokens || typeof parsed.tokens !== 'object') {
      errors.push('Campo "tokens" es requerido y debe ser object');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, theme: parsed as Theme };
  } catch {
    return { valid: false, errors: ['JSON invalido: sintaxis incorrecta'] };
  }
}

/**
 * Importa un tema desde un archivo seleccionado por el usuario.
 */
export function importThemeFromFile(): Promise<Theme | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const text = await file.text();
      const result = validateThemeJSON(text);

      if (result.valid && result.theme) {
        resolve(result.theme);
      } else {
        console.error('Tema invalido:', result.errors);
        resolve(null);
      }
    };

    input.click();
  });
}

/**
 * Fusiona dos temas, aplicando override sobre base.
 */
export function mergeThemes(
  base: Theme,
  override: Partial<Theme>
): Theme {
  return {
    ...base,
    ...override,
    id: `${base.id}-merged-${Date.now()}`,
    tokens: deepMergeTokens(base.tokens, override.tokens ?? {}),
  };
}

function deepMergeTokens(
  base: ThemeTokenMap,
  override: Partial<ThemeTokenMap>
): ThemeTokenMap {
  const result = { ...base };

  for (const [category, tokens] of Object.entries(override)) {
    if (tokens && typeof tokens === 'object') {
      (result as Record<string, unknown>)[category] = {
        ...((base as Record<string, unknown>)[category] as object),
        ...tokens,
      };
    }
  }

  return result;
}
```

### Ejemplo: UI de import/export

```tsx
import { downloadTheme, importThemeFromFile } from '../themes/export-import';
import { useTheme } from '../themes/useTheme';

function ThemeIO() {
  const { theme, setTheme, availableThemes } = useTheme();

  const handleExport = () => {
    downloadTheme(theme);
  };

  const handleImport = async () => {
    const imported = await importThemeFromFile();
    if (imported) {
      // Registrar el tema importado y activarlo
      registerTheme(imported);
      setTheme(imported.id);
    }
  };

  return (
    <div className="flex gap-sm">
      <button
        onClick={handleExport}
        className="px-md py-sm bg-primary/15 text-primary rounded-lg
                   border border-primary/30 text-sm font-medium
                   hover:bg-primary/25 transition-colors duration-fast"
      >
        Exportar tema actual
      </button>
      <button
        onClick={handleImport}
        className="px-md py-sm bg-surface-alt text-text-muted rounded-lg
                   border border-border text-sm font-medium
                   hover:bg-surface-elevated hover:text-text
                   transition-colors duration-fast"
      >
        Importar tema
      </button>
    </div>
  );
}
```

---

## 11. Temas Built-in

Vantare Overlays incluye cuatro temas predefinidos, cada uno disenado para
un estilo visual distinto.

### Dark (Default)

El tema por defecto. Paleta oscura neutra con acentos morados que funciona
bajo cualquier condicion de streaming.

| Propiedad | Valor |
|---|---|
| Superficie | `#0f0f14` — negro azulado profundo |
| Primario | `#6c5ce7` — violeta vibrante |
| Secundario | `#00cec9` — cyan/teal |
| Texto | `#e8e8f0` — blanco ligeramente azulado |
| Estilo | Profesional, limpio, versatil |
| Uso recomendado | Streaming general, gaming, tutoriales |

### Blood

Tema intenso con rojos carmesi sobre fondo negro puro. Disenado para
streams de horror, accion o contenido con estetica oscura.

| Propiedad | Valor |
|---|---|
| Superficie | `#0a0000` — negro con tinte rojo |
| Primario | `#dc143c` — rojo carmesi |
| Secundario | `#ff6b6b` — rojo coral |
| Texto | `#ffe0e0` — blanco rojizo |
| Estilo | Intenso, dramatico, agresivo |
| Uso recomendado | Horror, accion, dark fantasy |

### Midnight

Azul oscuro elegante con toques de indigo. Tema sofisticado para
contenido profesional, podcasts o charlas.

| Propiedad | Valor |
|---|---|
| Superficie | `#0d1117` — azul marino profundo |
| Primario | `#58a6ff` — azul claro brillante |
| Secundario | `#79c0ff` — azul cielo |
| Texto | `#c9d1d9` — gris azulado claro |
| Estilo | Elegante, profesional, sereno |
| Uso recomendado | Podcasts, entrevistas, contenido corporativo |

### Midnight Ocean

Variacion de Midnight con tonos oceanicoss — teal y azul profundo.
Ideal para streams de naturaleza, ciencia o contenido relajante.

| Propiedad | Valor |
|---|---|
| Superficie | `#0b1929` — azul oceano profundo |
| Primario | `#00b4d8` — cyan oceano |
| Secundario | `#90e0ef` — azul claro agua |
| Texto | `#e0f4ff` — blanco azulado |
| Estilo | Relajante, natural, inmersivo |
| Uso recomendado | Naturaleza, ciencia, ASMR, chill streams |

### Combinar temas

Puedes crear un tema hibrido usando el sistema de herencia:

```json
{
  "id": "blood-midnight",
  "name": "Blood x Midnight",
  "description": "Intensidad de Blood con la elegancia de Midnight",
  "parent": "midnight",
  "tokens": {
    "color": {
      "primary": "#dc143c",
      "primaryHover": "#e8304f",
      "primaryMuted": "#dc143c25",
      "secondary": "#ff6b6b",
      "positive": "#ff6b6b",
      "negative": "#dc143c"
    }
  }
}
```

---

## 12. Persistencia

Los temas y configuraciones se guardan usando `electron-store` para
mantener la persistencia entre sesiones.

### Estructura de almacenamiento

```typescript
// src/themes/persistence.ts
import Store from 'electron-store';

interface ThemeStore {
  /** ID del tema activo */
  activeThemeId: string;
  /** Tokens customizados del tema activo (overrides manuales) */
  customTokens: Partial<ThemeTokenMap> | null;
  /** Overrides por overlay */
  overlayThemeOverrides: Record<string, Partial<ThemeTokenMap>>;
  /** Temas importados por el usuario */
  importedThemes: Theme[];
  /** Historial de temas usados (para undo rapido) */
  themeHistory: string[];
}

const themeStore = new Store<ThemeStore>({
  name: 'vantare-themes',
  defaults: {
    activeThemeId: 'dark',
    customTokens: null,
    overlayThemeOverrides: {},
    importedThemes: [],
    themeHistory: ['dark'],
  },
});
```

### Operaciones de persistencia

```typescript
export function saveActiveTheme(themeId: string): void {
  themeStore.set('activeThemeId', themeId);

  // Agregar al historial (maximo 20 entradas)
  const history = themeStore.get('themeHistory', []);
  const filtered = history.filter((id) => id !== themeId);
  filtered.unshift(themeId);
  if (filtered.length > 20) filtered.pop();
  themeStore.set('themeHistory', filtered);
}

export function getActiveThemeId(): string {
  return themeStore.get('activeThemeId', 'dark');
}

export function saveOverlayOverrides(
  overlayId: string,
  overrides: Partial<ThemeTokenMap>
): void {
  themeStore.set(`overlayThemeOverrides.${overlayId}`, overrides);
}

export function getOverlayOverrides(
  overlayId: string
): Partial<ThemeTokenMap> {
  return themeStore.get(`overlayThemeOverrides.${overlayId}`, {});
}

export function clearOverlayOverrides(overlayId: string): void {
  themeStore.delete(`overlayThemeOverrides.${overlayId}` as any);
}

export function saveImportedTheme(theme: Theme): void {
  const imported = themeStore.get('importedThemes', []);
  const existing = imported.findIndex((t) => t.id === theme.id);

  if (existing >= 0) {
    imported[existing] = theme;
  } else {
    imported.push(theme);
  }

  themeStore.set('importedThemes', imported);
}

export function removeImportedTheme(themeId: string): void {
  const imported = themeStore.get('importedThemes', []);
  themeStore.set(
    'importedThemes',
    imported.filter((t) => t.id !== themeId)
  );
}

export function getThemeHistory(): string[] {
  return themeStore.get('themeHistory', ['dark']);
}
```

### Sincronizacion entre ventanas

Cuando el usuario cambia de tema en una ventana, las demas ventanas
de Electron se actualizan via IPC:

```typescript
// Main process
import { ipcMain, BrowserWindow } from 'electron';

ipcMain.on('theme:change', (event, themeId) => {
  saveActiveTheme(themeId);

  // Notificar a todas las ventanas
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('theme:changed', themeId);
  });
});

// Renderer process
const { ipcRenderer } = require('electron');

ipcRenderer.on('theme:changed', (event, themeId) => {
  // Re-aplicar el tema en esta ventana
  applyThemeById(themeId);
});
```

---

## 13. Accessibility

El sistema de temas esta disenado para cumplir con WCAG 2.1 AA en todas
las combinaciones de colores por defecto.

### Ratios de contraste minimos

| Nivel WCAG | Ratio minimo | Uso en Vantare |
|---|---|---|
| AA normal text | 4.5:1 | Texto cuerpo, labels |
| AA large text | 3:1 | Titulos, texto grande |
| AAA normal text | 7:1 | Objetivo para texto critico |
| AAA large text | 4.5:1 | Objetivo para titulos |

### Validacion de temas

```typescript
// src/themes/theme-utils.ts

/**
 * Calcula el ratio de contraste entre dos colores (WCAG 2.1).
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getWCAGLevel(ratio: number): 'AAA' | 'AA' | 'FAIL' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

/**
 * Valida todos los pares de colores criticos de un tema.
 */
export function validateThemeContrast(theme: Theme): {
  passed: boolean;
  pairs: Array<{
    name: string;
    fg: string;
    bg: string;
    ratio: number;
    level: string;
  }>;
} {
  const t = theme.tokens.color;
  const criticalPairs = [
    { name: 'Texto principal / Fondo', fg: t.text, bg: t.surface },
    { name: 'Texto muted / Fondo', fg: t.textMuted, bg: t.surface },
    { name: 'Primario / Fondo', fg: t.primary, bg: t.surface },
    { name: 'Secundario / Fondo', fg: t.secondary, bg: t.surface },
    { name: 'Positivo / Fondo', fg: t.positive, bg: t.surface },
    { name: 'Negativo / Fondo', fg: t.negative, bg: t.surface },
    { name: 'Texto / Surface Alt', fg: t.text, bg: t.surfaceAlt },
    { name: 'Texto / Surface Elevated', fg: t.text, bg: t.surfaceElevated },
    { name: 'Texto Inverso / Primario', fg: t.textInverse, bg: t.primary },
  ];

  const pairs = criticalPairs.map((pair) => {
    const ratio = getContrastRatio(pair.fg, pair.bg);
    return {
      name: pair.name,
      fg: pair.fg,
      bg: pair.bg,
      ratio: Math.round(ratio * 100) / 100,
      level: getWCAGLevel(ratio),
    };
  });

  const passed = pairs.every((p) => p.level !== 'FAIL');

  return { passed, pairs };
}
```

### Mejores practicas de accesibilidad

1. **Nunca uses color como unico indicador.** Los delta indicators incluyen
   iconos de flecha ademas de color.
2. **Asegura que el texto muted tenga suficiente contraste.** Aunque es
   texto secundario, debe ser legible.
3. **Provide high-contrast mode.** Los usuarios pueden crear un tema con
   ratios AAA para necesidades de accesibilidad.
4. **Testea en stream.** Los colores pueden cambiar al ser codificados por
   OBS/streaming. Verifica en la calidad real de transmision.

---

## 14. Performance

El sistema de temas esta disenado para minimizar el impacto en rendimiento,
especialmente durante el streaming donde cada frame cuenta.

### CSS Variables vs Class Swaps

| Aspecto | CSS Variables (Vantare) | Class Swaps (alternativa) |
|---|---|---|
| Cambio de tema | Actualiza ~56 variables en `:root` | Agrega/quita ~50+ clases en `:root` |
| Render trigger | Repaint (mismo layout) | Repaint + reflow potencial |
| Overhead estimado | <1ms por cambio | 2-5ms por cambio |
| Selectores CSS | `var(--token)` se resuelven en paint | Clases directas, resolucion inmediata |
| Overrides por overlay | Variables adicionales en nodo | Clases adicionales por overlay |
| Compatibilidad Tailwind v4 | nativa via `@theme` | requiere configuracion custom |

### Optimizaciones implementadas

```typescript
// 1. Batch de actualizaciones DOM
function applyThemeToDOM(tokens: ThemeTokenMap) {
  // Usar requestAnimationFrame para agrupar cambios
  requestAnimationFrame(() => {
    const root = document.documentElement;
    const updates: [string, string][] = [];

    // Recopilar todas las actualizaciones
    for (const [category, values] of Object.entries(tokens)) {
      if (typeof values === 'object' && values !== null) {
        for (const [token, value] of Object.entries(values)) {
          const cssVar = `--${category}-${camelToKebab(token)}`;
          updates.push([cssVar, String(value)]);
        }
      }
    }

    // Aplicar todas de una vez (evita reflows intermedios)
    for (const [prop, val] of updates) {
      root.style.setProperty(prop, val);
    }
  });
}

// 2. Debounce en edicion de color picker
function useDebouncedTokenUpdate(
  setToken: (category: any, token: any, value: any) => void,
  delay: number = 50
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (category: any, token: any, value: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setToken(category, token, value);
      }, delay);
    },
    [setToken, delay]
  );
}

// 3. Memoizacion de tokens derivados
function useComputedTokens(tokens: ThemeTokenMap) {
  return useMemo(() => ({
    ...tokens,
    derived: {
      primaryBgAlpha: (alpha: number) =>
        `color-mix(in srgb, ${tokens.color.primary} ${alpha * 100}%, transparent)`,
      surfaceBgAlpha: (alpha: number) =>
        `color-mix(in srgb, ${tokens.color.surface} ${alpha * 100}%, transparent)`,
      isHighContrast:
        getContrastRatio(tokens.color.text, tokens.color.surface) >= 7,
    },
  }), [tokens]);
}
```

### Medidas de rendimiento

| Metrica | Objetivo | Como verificar |
|---|---|---|
| Time to apply theme | <2ms | Performance DevTools |
| Layout thrashing | 0 reflows | Layout Shift Regions |
| Animation jank | 0 frames perdidos | Performance Monitor |
| Memory leak (listeners) | 0 | Heap snapshots |
| Bundle impact | <2KB gzip | Bundle analyzer |

### Reglas de performance

1. **Nunca** leas `offsetHeight`/`offsetWidth` durante la aplicacion de tema.
   Esto fuerza un reflow sincrono.
2. **Usa** `requestAnimationFrame` para agrupar cambios de CSS variables.
3. **Debounea** los cambios durante drag de color picker (50ms).
4. **Memoiza** componentes que consumen tokens via `React.memo` o `useMemo`.
5. **Evita** crear objetos de estilo nuevos en cada render — memoiza los
   estilos derivados.
6. **Prefiere** utility classes de Tailwind sobre `style` prop cuando sea
   posible (se cachean mejor).

---

## Referencia rapida

| Tarea | Comando / API |
|---|---|
| Cambiar tema activo | `setTheme('blood')` |
| Modificar un token | `setToken('color', 'primary', '#ff0000')` |
| Override por overlay | `useOverlayTheme(overlayId).setOverride(...)` |
| Exportar tema | `downloadTheme(theme)` |
| Importar tema | `importThemeFromFile()` |
| Validar contraste | `validateThemeContrast(theme)` |
| Guardar en persistencia | `saveActiveTheme(themeId)` |
| Limpiar overrides overlay | `clearOverlayOverrides(overlayId)` |

---

> **Ultima actualizacion:** 2026-06-01
> **Version del documento:** 1.0.0
> **Autor:** Vantare Overlays Team
