# 06 — Diseño UI y referencia visual

> **Regla absoluta:** No improvisar estética del hub. Fuente canónica: [`hub_main_v5.html`](../../hub_main_v5.html)

Documento técnico: [`../V2-DESIGN-REFERENCE.md`](../V2-DESIGN-REFERENCE.md)

---

## Single source of truth

`hub_main_v5.html` en la raíz del repo es el mockup **aprobado por Isaac** (2026-06-11). Contiene:

- Tailwind CDN config con colores `vantare.*`
- Tipografías Google Fonts: Inter, Rajdhani, Space Mono
- Componentes CSS: glass-panel, card-sleek, btn-primary, nav-item, premium-bg, hero-text-huge, pro-badge
- Layout completo: topbar → hero → banner → grid 12 col

Abrir en navegador (Windows):

```powershell
start hub_main_v5.html
```

---

## Tokens implementados en v2

Archivo: [`vantare-v2/frontend/src/index.css`](../../vantare-v2/frontend/src/index.css)

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| vantare-bg | `#080808` | Fondo hub |
| vantare-surface | `#0F0F0F` | Superficies |
| vantare-panel | `#141414` | Paneles |
| vantare-border | `#1E1E1E` | Bordes |
| vantare-text | `#E8E8E8` | Texto principal |
| vantare-textMuted | `#7A7A7A` | Secundario |
| vantare-red-500 | `#C1121F` | Acento |
| vantare-red-400 | `#E63946` | Acento hover/chart |

### Tipografía

| Rol | Font |
|-----|------|
| Body | Inter |
| Display / títulos | Rajdhani |
| Mono / gaps / tiempos | Space Mono |

Cargadas en [`vantare-v2/frontend/index.html`](../../vantare-v2/frontend/index.html).

---

## Layout hub (Fase 5)

```
┌─ Topbar (h-14, glass) ─────────────────────────────────────┐
│ Logo · Nav: Hub | Overlays | Telemetría | Setup · Avatar   │
├─ Hero (~300px) ────────────────────────────────────────────┤
│ VANTARE (gradient) │ Panel coche / circuito / sesión       │
├─ Event banner (full width) ──────────────────────────────┤
└─ Grid xl: 12 columnas ─────────────────────────────────────┘
   ├─ 8 cols: ratings (2 cards) + chart iRating + recent races
   └─ 4 cols: Pro promo + ecosystem apps
```

Componentes React en `frontend/src/hub/components/` y páginas en `pages/`.

---

## Widgets overlay (lenguaje visual)

Los widgets in-game **heredan** el lenguaje v5, no copian bloques del HTML:

| Widget | Patrones |
|--------|----------|
| Delta | Barra h-2, gradient rojo/verde, labels uppercase 10px |
| Relative | Filas card-sleek, highlight player bg-white/10, gaps mono |
| Standings | Filas tipo “carreras recientes”, stripe lateral rojo/verde |

Contenedor: `.glass-panel` + `rounded-xl` + `border-white/5`.

---

## Alcance visual por fase

| Fase | Alcance diseño |
|------|----------------|
| 4 | Tokens mínimos en widgets |
| 5 | Hub layout completo v5 |
| 8 | Export themes JSON + swap runtime + pixel-perfect overlay |

---

## Errores comunes a evitar

- Inventar colores fuera de paleta vantare-*.
- Usar Chart.js en hub si el plan dice canvas ligero (F5 usa canvas custom en RatingChart).
- Mezclar estética F1 sprint v1 (`apps/desktop`) con hub v5 sin aprobación.
- Cambiar copy/idioma del hub sin criterio (actualmente español en UI hub).

---

## Checklist visual antes de cerrar fase UI

- [ ] Screenshot hub vs `hub_main_v5.html` (misma resolución ~1280px)
- [ ] Tokens no hardcodeados fuera de `@theme` / clases compartidas
- [ ] Fuentes cargan offline/build (Google Fonts en index.html)
- [ ] `prefers-reduced-motion` respetado donde haya animaciones (F8+)
