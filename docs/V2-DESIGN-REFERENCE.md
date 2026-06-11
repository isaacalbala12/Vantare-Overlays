# Vantare v2 — Referencia visual (Hub v5)

> **Fuente canónica de diseño:** [`../hub_main_v5.html`](../hub_main_v5.html)  
> **Estado:** Aprobado por producto (Isaac) · **Fecha:** 2026-06-11

El HTML **Hub Principal v5** es la **single source of truth** para la dirección artística de v2: tokens, tipografía, glassmorphism, motion y patrones de layout. Los agentes **no improvisan** estética — extraen de este archivo (o de tokens generados desde él).

---

## Alcance por fase

| Fase | Qué portar desde v5 |
|------|---------------------|
| **4** (overlay widgets) | Solo **tokens mínimos**: `.glass-panel`, fuentes, colores delta ±, filas tipo `card-sleek` / mono labels |
| **5** (Hub Wails) | **Layout completo**: topbar, hero, grid 12 col, paneles ratings, chart, carreras, sidebar Pro/ecosistema |
| **8** (Temas) | Exportar tokens Tailwind → `themes/vantare-v5.json` + CSS variables |

**Regla Fase 4 closeout:** funcionalidad y layout JSON primero; pulido visual profundo **después** del port de tokens (no bloquear F4 por pixel-perfect).

---

## Design tokens (extraídos de v5)

### Tipografía

| Rol | Familia | Uso |
|-----|---------|-----|
| UI body | `Inter` | Texto general, labels |
| Display | `Rajdhani` | Títulos, hero, headings de sección |
| Mono / telemetría | `Space Mono` | Gaps, tiempos, datos numéricos overlay |

### Paleta `vantare`

```text
bg:         #080808
surface:    #0F0F0F
panel:      #141414
border:     #1E1E1E
text:       #E8E8E8
textMuted:  #7A7A7A
red-500:    #C1121F   (acento principal)
red-400:    #E63946
burgundy:   #4A0E16
blood:      #8B0000
```

### Componentes CSS reutilizables (copiar a `frontend/src/styles/vantare-v5.css`)

| Clase | Uso |
|-------|-----|
| `.glass-panel` | Paneles hub + contenedores overlay |
| `.card-sleek` | Filas standings/relative/carreras recientes |
| `.btn-primary` / `.btn-secondary` | Hub CTAs |
| `.nav-item` | Navegación hub (underline gradient rojo) |
| `.premium-bg` | Fondo hub (dot grid + `#080808`) |
| `.hero-text-huge` | Tipografía hero gradient |
| `.pro-badge` | Badge dorado Pro |

### Motion

- Entrada: `animate-fade-in-up` — `cubic-bezier(0.16, 1, 0.3, 1)`
- Hover cards: `translateY(-2px)` + border rojo sutil
- Live indicator: punto pulsante `vantare-red-500`

### Layout hub (Fase 5)

```
┌─ Topbar glass (h-14) ─────────────────────────────────────┐
├─ Hero 300px: VANTARE + panel coche/circuito/sesión ───────┤
├─ Banner full-width: próximo evento ───────────────────────┤
└─ Grid xl:12 ──────────────────────────────────────────────┘
   ├─ 8 cols: ratings (2) + chart iRating + carreras recientes
   └─ 4 cols: promo Pro + ecosistema apps
```

---

## Overlay widgets (derivar de v5)

Los widgets in-game **no están** en el HTML como bloques separados; heredan el lenguaje visual:

| Widget | Patrones v5 a reutilizar |
|--------|--------------------------|
| **Delta** | Barra progreso estilo ratings (`h-2`, gradient rojo/verde), label `text-[10px] uppercase tracking-wider` |
| **Relative** | Filas `card-sleek` compactas, highlight player = `bg-white/10`, gaps en `font-mono` |
| **Standings** | Misma fila que “Carreras recientes” (stripe lateral rojo/verde, `font-display` en posición) |

Contenedor overlay: `.glass-panel` + `rounded-xl` + `border-white/5`.

---

## Workflow de implementación

1. **Spike (≤ 2 h):** Copiar tokens Tailwind v4 en `vantare-v2/frontend/src/index.css` desde `tailwind.config` del HTML.
2. **Componentizar:** Extraer `GlassPanel`, `VantareButton`, `SectionHeading` en `frontend/src/components/` (F5).
3. **Hub page-by-page:** Hero → grid → sidebar (plan `v2-f5-hub-dashboard.md`).
4. **Overlays:** Re-skin widgets F4 con tokens (tarea F8 o sub-task post-F5).

### Comando útil

Abrir referencia en navegador:

```bash
# Desde raíz repo
start hub_main_v5.html   # Windows
```

---

## Archivo fuente

| Archivo | Descripción |
|---------|-------------|
| [`hub_main_v5.html`](../hub_main_v5.html) | Mockup interactivo hub (Tailwind CDN + Chart.js) |

**Recomendación repo:** mover a `docs/reference/hub_main_v5.html` en el próximo commit para versionarlo junto al código.

---

## Referencias cruzadas

- Plan maestro Fase 5: [`V2-MASTER-PLAN.md`](./V2-MASTER-PLAN.md)
- Miniplan diseño: [`.omo/plans/v2-design-hub-v5-reference.md`](../.omo/plans/v2-design-hub-v5-reference.md)
- Stack (Lite mode / temas): [`V2-STACK-AND-PERFORMANCE.md`](./V2-STACK-AND-PERFORMANCE.md) §12
